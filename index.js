const express = require("express");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());

// Teste de rota GET (opcional)
app.get("/", (req, res) => {
  res.send("Webhook da Kommo está funcionando! 🚀");
});

// Rota principal do webhook
app.post("/webhook", (req, res) => {
  const nome = req.body.nome || "Cliente";
  const limite = parseFloat(req.body.limite || 0);

  if (!limite || isNaN(limite)) {
    return res.json({
      show: {
        type: "text",
        value: `Olá ${nome}, não consegui entender o valor do seu limite. 😔`
      }
    });
  }

  const valorSaque = (limite / 1.56).toFixed(2); // Exemplo com taxa de 56%
  const valorParcela = (valorSaque / 12).toFixed(2); // 12x como exemplo

  res.json({
    show: {
      type: "text",
      value: `💳 Limite disponível: R$ ${limite.toLocaleString("pt-BR")}
📆 12x de R$ ${valorParcela} = R$ ${valorSaque} de saque aproximado.

Esta é a melhor opção em custo-benefício, ${nome}. Vamos avançar?`
    }
  });
});

// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});
