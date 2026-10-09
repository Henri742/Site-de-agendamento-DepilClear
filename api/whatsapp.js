// api/whatsapp.js

export default async function handler(req, res) {
  // Configurações de CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido.' });
  }

  const { phone, message } = req.body || {};

  if (!phone || !message) {
    return res.status(400).json({ erro: 'Telefone e mensagem são obrigatórios.' });
  }

  // Higieniza o número: remove caracteres não numéricos
  let cleanPhone = phone.replace(/\D/g, '');

  // Adiciona o DDI 55 (Brasil) caso não venha no número
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = '55' + cleanPhone;
  }

  // Variáveis de ambiente configuradas na Vercel
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
    // Exemplo de payload compatível com Evolution API / Z-API
    const response = await fetch(`${WPP_API_URL}/message/sendText/${WPP_INSTANCE || ''}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': WPP_API_TOKEN,
        'Authorization': `Bearer ${WPP_API_TOKEN}`
      },
      body: JSON.stringify({
        number: cleanPhone,
        text: message
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[ERRO DISPARO WPP]', data);
      return res.status(response.status).json({ erro: 'Falha no gateway do WhatsApp.', detalhe: data });
    }

    return res.status(200).json({ sucesso: true, retorno: data });
  } catch (error) {
    console.error('[EXCEÇÃO WHATSAPP]', error);
    return res.status(500).json({ erro: `Erro ao enviar mensagem: ${error.message}` });
  }
}