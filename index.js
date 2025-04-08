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
    1: 23.00, 2: 66.86, 3: 68.93, 4: 70.48, 5: 71.00,
    6: 71.48, 7: 71.78, 8: 72.24, 9: 72.62, 10: 72.90,
    11: 73.25, 12: 73.64, 13: 75.11, 14: 77.80, 15: 78.50,
    16: 80.80, 17: 81.90, 18: 83.60
  };

  let resultado = [];

  for (let i = 1; i <= 18; i++) {
    const taxa = taxas[i] / 100;
    const valorSaque = limite / (1 + taxa);
    const parcela = limite / i;

    resultado.push({
      texto: `*${i}x* de *R$ ${parcela.toFixed(2).replace('.', ',')}* - Saque total: *R$ ${valorSaque.toFixed(2).replace('.', ',')}*`,
      parcelas: parcela,
      saque: valorSaque,
      qtdParcelas: i
    });
  }

  return resultado;
};

let ngrokUrl = process.env.NGROK_URL || ""; // fallback

// Webhook disparado por mudança de etapa no pipeline
app.post("/webhook", async (req, res) => {
  const leadId = req.body.leads?.add?.[0]?.id || req.body.leads?.status?.[0]?.id;
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
    const campoParcelas = leadData.custom_fields_values?.find(c => c.field_id === 1054600); // ✅ Adicione essa linha
    
    const valor = campoLimite?.values?.[0]?.value || "";
    const parcelas = parseInt(campoParcelas?.values?.[0]?.value || 0);

    try {
      // 🔗 Chamada para o servidor Python via ngrok
      const respostaLink = await axios.post(ngrokUrl, {
        valor: valor.toString().replace(".", ","), // assegura o formato brasileiro
        parcelas: parcelas
      });
    
      const linkProposta = respostaLink.data.link;
      console.log("🔗 Link recebido do servidor Python:", linkProposta);
    
      // Se quiser salvar esse link no Kommo (em algum campo específico):
      await axios.patch(`https://vitorcarvalho.kommo.com/api/v4/leads/${leadId}`, {
        custom_fields_values: [
          {
            field_id: 1054606, // ← Altere para o ID real do campo "Link Gerado"
            values: [{ value: linkProposta }]
          }
        ]
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      });
    
    } catch (err) {
      console.error("❌ Erro ao gerar link com servidor Python:", err.response?.data || err.message);
    }

    if (!limite || isNaN(limite)) {
      console.error("❌ Limite inválido ou ausente no lead");
      return res.status(400).json({ erro: "Valor de simulação inválido" });
    }

    const resultados = calcularParcelamentos(limite);
    const resultadosTexto = resultados.map(r => r.texto).join("\n");

    const sugestao12x = resultados.find(r => r.qtdParcelas === 12)?.texto || "";

    // Atualiza o lead com resultados e muda de estágio
    await axios.patch(`https://vitorcarvalho.kommo.com/api/v4/leads/${leadId}`, {
      custom_fields_values: [
        {
          field_id: 1051168, // Resultado simulação
          values: [{ value: resultadosTexto }]
        },
        {
          field_id: 1051268, // Valor Simulação (para persistência também)
          values: [{ value: limite.toString() }]
        },
        {
          field_id: 1051314, // Resultado Simulação Sugerido
          values: [{ value: sugestao12x }]
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
