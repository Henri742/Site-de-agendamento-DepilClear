import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { clientId } = req.query;

  if (req.method === 'GET') {
    try {
      let q = supabase.from('fidelidade_pontos').select('*').order('created_at', { ascending: true });
      if (clientId) q = q.eq('client_id', clientId);
      const { data, error } = await q;
      if (error) throw error;
      return res.status(200).json({ pontos: data || [] });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  if (req.method === 'POST') {
    const { clientId, clientName, origem, descricao } = req.body || {};
    try {
      const { count } = await supabase
        .from('fidelidade_pontos')
        .select('*', { count: 'exact', head: true })
        .eq('client_id', clientId);

      if (count >= 10) {
        return res.status(400).json({ erro: 'Cartão com 10 selos completos.' });
      }

      const { data, error } = await supabase.from('fidelidade_pontos').insert([{
        client_id: clientId,
        client_name: clientName,
        origem: origem || 'atendimento',
        descricao: descricao || ''
      }]).select();

      if (error) throw error;
      return res.status(201).json({ sucesso: true, ponto: data[0] });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  if (req.method === 'DELETE') {
    const { clientId, quantidade } = req.body || {};
    try {
      if (quantidade === 10 || !quantidade) {
        await supabase.from('fidelidade_pontos').delete().eq('client_id', clientId);
      } else {
        const { data: pts } = await supabase
          .from('fidelidade_pontos')
          .select('id')
          .eq('client_id', clientId)
          .order('created_at', { ascending: true })
          .limit(quantidade);

        const ids = (pts || []).map(p => p.id);
        if (ids.length > 0) {
          await supabase.from('fidelidade_pontos').delete().in('id', ids);
        }
      }
      return res.status(200).json({ sucesso: true });
    } catch (err) {
      return res.status(500).json({ erro: err.message });
    }
  }

  return res.status(405).json({ erro: 'Método não permitido.' });
}