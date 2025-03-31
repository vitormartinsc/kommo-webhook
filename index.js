import express from 'express';
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.post("/webhook", (req, res) => {
  console.log("📨 Webhook recebido:", req.body);

  // Exemplo de processamento
  const data = req.body;

  // Aqui você pode aplicar lógica como calcular valor com base em limite + parcelas
  // ou simplesmente retornar uma confirmação
  res.json({ status: "ok", mensagem: "Webhook processado com sucesso!", recebido: data });
});

app.get("/", (req, res) => {
  res.send("Webhook ativo! 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
