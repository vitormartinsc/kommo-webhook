const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Rota padrão para testar o webhook
app.post('/webhook', (req, res) => {
  console.log('📩 Webhook recebido:', req.body);

  // Resposta de teste
  const respostaTeste = {
    status: 'ok',
    mensagem: 'Webhook ativo com sucesso!',
    data_exemplo: '2025-04-01',
    valor_simulado: 12345
  };

  res.status(200).json(respostaTeste);
});

app.listen(PORT, () => {
  console.log(`🚀 Webhook rodando em http://localhost:${PORT}/webhook`);
});
