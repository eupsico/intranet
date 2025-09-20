// Arquivo: /modulos/voluntario/js/mensagens.js
// Versão: 2.2 (Simplificado, responsabilidades divididas e código morto removido)
// Descrição: Módulo para a aba "Modelos de Mensagem". Controla a geração de texto.

export function init(db, user, userData) {
    const container = document.getElementById('mensagens');
    if (!container) {
        console.error("Container da aba de mensagens não encontrado.");
        return;
    }

    // --- FUNÇÕES AUXILIARES ---
    const getGreeting = () => {
        const h = new Date().getHours();
        if (h >= 5 && h < 12) return 'Bom dia';
        if (h >= 12 && h < 18) return 'Boa tarde';
        return 'Boa noite';
    };

    const formatDateToDDMM = (str) => {
        if (!str) return '';
        const [year, month, day] = str.split('-');
        return `${day}/${month}`;
    };

    const generateAndCopy = (outputElementId, message) => {
        const outputElement = document.getElementById(outputElementId);
        if (outputElement) {
            outputElement.value = message;
            outputElement.select();
            navigator.clipboard.writeText(message)
                .then(() => alert('Mensagem copiada para a área de transferência!'))
                .catch(err => {
                    console.error('Falha ao copiar a mensagem:', err);
                    alert('Falha ao copiar. Por favor, copie manualmente da caixa de texto.');
                });
        }
    };

    // --- INICIALIZAÇÃO DOS CAMPOS DOS FORMULÁRIOS ---
    const setupFormFields = () => {
        // Preenche o seletor de meses
        const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const mesSelect = document.getElementById('cobranca-mes');
        if (mesSelect) {
            mesSelect.innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');
        }

        // Preenche o seletor de horas
        const horaSelect = document.getElementById('agendada-hora');
        if (horaSelect) {
            let hoursOptions = '';
            for (let i = 8; i <= 21; i++) {
                const hour = String(i).padStart(2, '0') + ':00';
                hoursOptions += `<option value="${hour}">${hour}</option>`;
            }
            horaSelect.innerHTML = hoursOptions;
        }
    };

    // --- EVENT LISTENERS DOS BOTÕES DE GERAR MENSAGEM ---
    const setupEventListeners = () => {
        const btnCobranca = document.getElementById('btn-cobranca');
        if (btnCobranca) {
            btnCobranca.addEventListener('click', () => {
                const p = document.getElementById('cobranca-paciente').value;
                const d = document.getElementById('cobranca-data').value;
                const m = document.getElementById('cobranca-mes').value;
                const v = document.getElementById('cobranca-valor').value;
                const px = document.getElementById('cobranca-pix').value;
                const msg = `${getGreeting()}, ${p}!\n\nPassando para lembrar sobre a sua contribuição mensal, com vencimento em *${formatDateToDDMM(d)}*.\n\n*Ao contribuir, você garante a continuidade do seu atendimento e apoia o trabalho da EuPsico.* 😊\n\n*Mês de Referência:* ${m}\n*Valor:* R$ ${v}\n*Chave PIX:* ${px}\n\nQualquer dúvida, estou à disposição.`;
                generateAndCopy('output-cobranca', msg);
            });
        }

        const btnAgendada = document.getElementById('btn-agendada');
        if (btnAgendada) {
            btnAgendada.addEventListener('click', () => {
                const tipo = document.getElementById('agendada-tipo').value;
                const p = document.getElementById('agendada-paciente').value;
                const t = document.getElementById('agendada-terapeuta').value;
                const prof = document.getElementById('agendada-profissao').value;
                const dia = document.getElementById('agendada-diasemana').value;
                const data = document.getElementById('agendada-data').value;
                const hora = document.getElementById('agendada-hora').value;
                
                let intro = tipo === 'plantao' 
                    ? `Meu nome é ${t} e sou o/a ${prof} da EuPsico que irá realizar seu atendimento no Plantão Psicológico.` 
                    : `Meu nome é ${t} e sou o/a ${prof} da EuPsico que irá realizar seu atendimento.`;
                
                let msg = tipo === 'plantao' 
                    ? `${getGreeting()}, ${p}!\n\n${intro}\n\nEscrevo para confirmar nossa primeira sessão:\n✨ *${dia}, ${formatDateToDDMM(data)} às ${hora}* ✨\n\nPara que você se sinta mais confortável para o nosso encontro, gostaria de explicar como funciona este acolhimento inicial. O Plantão Psicológico é um *atendimento breve e focado* (de até quatro sessões), onde nosso objetivo será:\n\n➡️ *Identificar sua demanda principal:* Compreender as questões que levaram você a buscar ajuda neste momento.\n➡️ *Avaliar sua necessidade:* Analisar a urgência e a natureza da sua queixa.\n➡️ *Realizar o encaminhamento adequado:* Direcionar você para a modalidade de terapia mais indicada ao final do nosso processo.\n\nDois pontos importantes sobre este formato:\n1. O Plantão funciona como uma porta de entrada. Ele *não é um processo psicoterapêutico completo*, mas sim o primeiro passo para o cuidado contínuo.\n2. Como profissional do Plantão, meu papel é te acolher e direcionar da melhor forma. Por isso, a terapia contínua, se for o caso, será realizada por *outro colega*, garantindo um encaminhamento isento e focado no que é melhor para você.\n\nSou ${prof} com registro profissional, e nosso atendimento é totalmente protegido pelo sigilo e pela ética profissional.\n\nSe tiver qualquer dúvida antes da nossa sessão, pode me perguntar. Estou à disposição para te acolher nesta jornada.` 
                    : `${getGreeting()}, ${p}!\n\n${intro}\n\nEscrevo para confirmar nossa primeira sessão:\n✨ *${dia}, ${formatDateToDDMM(data)} às ${hora}* ✨\n\nCaso precise remarcar, por favor, me avise com no mínimo 24 horas de antecedência.\n\nAté lá!`;
                
                generateAndCopy('output-agendada', msg);
            });
        }
    };

    // --- INICIALIZAÇÃO DO MÓDULO ---
    setupFormFields();
    setupEventListeners();
}