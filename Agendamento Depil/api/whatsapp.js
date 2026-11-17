// api/whatsapp.js
import { applyCors, requireAuth } from './_auth.js';
import { rateLimit } from './_ratelimit.js';

export default async function handler(req, res) {
  if (!applyCors(req, res, 'POST, OPTIONS')) return;

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido.' });

  // Só usuários logados disparam mensagens
  const usuario = requireAuth(req, res);
  if (!usuario) return;

  // Contém abuso/spam: 30 requisições por minuto por IP
  if (!(await rateLimit(req, res, { name: 'whatsapp', limit: 30, windowSec: 60 }))) return;

  const { phone, message } = req.body || {};

  if (!phone || !message || typeof phone !== 'string' || typeof message !== 'string') {
    return res.status(400).json({ erro: 'Telefone e mensagem são obrigatórios.' });
  }
  if (message.length > 2000) {
    return res.status(400).json({ erro: 'Mensagem muito longa.' });
  }

  // Higieniza: só dígitos; acrescenta o DDI 55 quando vier só DDD + número
  let cleanPhone = phone.replace(/\D/g, '');
  if (cleanPhone.length === 10 || cleanPhone.length === 11) cleanPhone = '55' + cleanPhone;

  // Validação final: apenas dígitos, DDI 55 e comprimento plausível (55 + DDD + 8/9 dígitos)
  if (!/^55\d{10,11}$/.test(cleanPhone)) {
    return res.status(400).json({ erro: 'Número de WhatsApp inválido.' });
  }

  // Auditoria SEM o conteúdo da mensagem (telefone mascarado: privacidade nos logs)
  const masked = `${cleanPhone.slice(0, 4)}*****${cleanPhone.slice(-4)}`;
  console.info('[AUDITORIA WHATSAPP]', JSON.stringify({
    quando: new Date().toISOString(),
    usuario: usuario.email || usuario.userId,
    telefone: masked,
    tamanhoMensagem: message.length
  }));

  const WPP_API_URL = process.env.WPP_API_URL;
  const WPP_API_TOKEN = process.env.WPP_API_TOKEN;
  const WPP_INSTANCE = process.env.WPP_INSTANCE;

  if (!WPP_API_URL || !WPP_API_TOKEN) {
    console.warn('[WHATSAPP API] Variáveis WPP_API_URL ou WPP_API_TOKEN ausentes. Modo simulação ativo.');
    return res.status(200).json({
      sucesso: true,
      simulacao: true,
      mensagem: 'Disparo simulado com sucesso (configure as variáveis na Vercel para envio real).'
    });
  }

  try {
    const response = await fetch(`${WPP_API_URL}/message/sendText/${encodeURIComponent(WPP_INSTANCE || '')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: WPP_API_TOKEN,
        Authorization: `Bearer ${WPP_API_TOKEN}`
      },
      body: JSON.stringify({ number: cleanPhone, text: message })
    });

    if (!response.ok) {
      // Detalhe do gateway só no log do servidor
      const detalhe = await response.text().catch(() => '');
      console.error('[ERRO DISPARO WPP]', response.status, detalhe.slice(0, 500));
      return res.status(502).json({ erro: 'Falha no gateway do WhatsApp.' });
    }

    return res.status(200).json({ sucesso: true });
  } catch (error) {
    console.error('[EXCEÇÃO WHATSAPP]', error);
    return res.status(500).json({ erro: 'Não foi possível enviar a mensagem agora.' });
  }
}
