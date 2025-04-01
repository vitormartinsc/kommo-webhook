const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Função para calcular saque e parcelas
const calcularParcelamentos = (limite) => {
  const taxas = {
    1: 23.00, 2: 55.00, 3: 55.10, 4: 55.20, 5: 55.30,
    6: 55.40, 7: 55.47, 8: 55.60, 9: 55.70, 10: 55.80,
    11: 55.87, 12: 56.00, 13: 67.05, 14: 67.30, 15: 67.55,
    16: 67.68, 17: 67.79, 18: 67.94
  };

  let resultado = [];

  for (let i = 1; i <= 18; i++) {
    const taxa = taxas[i] / 100;
    const valorSaque = limite / (1 + taxa);
    const parcela = valorSaque / i;

    resultado.push(`${i}x de R$ ${parcela.toFixed(2).replace('.', ',')} - Saque total: R$ ${valorSaque.toFixed(2).replace('.', ',')}`);
  }

  return resultado.join("\n");
};

// Webhook principal
app.post("/webhook", async (req, res) => {
  const { lead_id, nome, valor_simulacao } = req.body;
  const token = process.env.KOMMO_TOKEN;

  const limite = parseFloat(valor_simulacao);
  if (!lead_id || isNaN(limite)) {
    return res.status(400).json({ erro: "Dados inválidos" });
  }

  const resultadosTexto = calcularParcelamentos(limite);

  try {
    // Atualiza campos personalizados
    await axios.patch(`https://vitorcarvalho.kommo.com/api/v4/leads/${lead_id}`, {
      custom_fields_values: [
        {
          field_id: 1051168, // Resultado simulação
          values: [{ value: resultadosTexto }]
        },
        {
          field_id: 1051268, // Valor Simulação (caso queira registrar também)
          values: [{ value: limite }]
        }
      ],
      status_id: 83236763 // Novo estágio do funil Simulação
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    res.json({ status: "sucesso", resultados: resultadosTexto });
  } catch (err) {
    console.error("Erro ao atualizar lead:", err.response?.data || err.message);
    res.status(500).json({ erro: "Falha ao atualizar lead no Kommo" });
  }
});

// Rota de teste GET
app.get("/", (req, res) => {
  res.send("Webhook da simulação está funcionando! 🚀");
});

// Inicializa o servidor
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando na porta ${PORT}`);
});
