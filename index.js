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
app.use(bodyParser.urlencoded({ extended: true }));

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

// Webhook disparado por mudança de etapa no pipeline
app.post("/webhook", async (req, res) => {
  const leadId = req.body["leads[status][0][id]"];
  console.log("🔔 Webhook recebido para lead:", leadId);

  const token = process.env.KOMMO_TOKEN;

  if (!leadId) {
    console.error("❌ lead_id não encontrado no corpo da requisição");
    return res.status(400).json({ erro: "lead_id ausente" });
  }

  try {
    // Buscar dados do lead na API do Kommo
    const response = await axios.get(`https://vitorcarvalho.kommo.com/api/v4/leads/${leadId}`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const leadData = response.data;
    const campoLimite = leadData.custom_fields_values?.find(c => c.field_id === 1051268);
    const limite = parseFloat(campoLimite?.values[0]?.value || 0);

    if (!limite || isNaN(limite)) {
      console.error("❌ Limite inválido ou ausente no lead");
      return res.status(400).json({ erro: "Valor de simulação inválido" });
    }

    const resultadosTexto = calcularParcelamentos(limite);

    // Atualiza o lead com resultados e muda de estágio
    await axios.patch(`https://vitorcarvalho.kommo.com/api/v4/leads/${leadId}`, {
      custom_fields_values: [
        {
          field_id: 1051168, // Resultado simulação
          values: [{ value: resultadosTexto }]
        },
        {
          field_id: 1051036, // Valor Simulação (para persistência também)
          values: [{ value: limite.toString() }]
        }
      ],
      status_id: 83236763 // Move para o estágio de Simulação
    }, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      }
    });

    console.log("✅ Lead atualizado com sucesso");
    res.json({ status: "sucesso", resultados: resultadosTexto });
  } catch (err) {
    console.error("🔥 Erro ao processar webhook:", err.response?.data || err.message);
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
