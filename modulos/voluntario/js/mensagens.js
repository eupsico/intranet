// Arquivo: /modulos/voluntario/js/mensagens.js
// Descrição: Módulo para a aba "Modelos de Mensagem".

export function init(db, user, userData) {
    const container = document.querySelector('#mensagens');
    if (!container) return;

    // --- FUNÇÕES AUXILIARES ---
    const getGreeting = () => {
        const h = new Date().getHours();
        if (h >= 5 && h < 12) return 'Bom dia';
        if (h >= 12 && h < 18) return 'Boa tarde';
        return 'Boa noite';
    };
    const getFutureDate = (days) => {
        const d = new Date();
        d.setDate(d.getDate() + days);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    };
    const formatDateTimeLocalString = (str) => {
        if (!str) return '';
        const d = new Date(str);
        const week = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        return `${week[d.getDay()]}, ${d.toLocaleDateString('pt-BR')} às ${String(d.getHours()).padStart(2, '0')}h`;
    };
    const formatDateToDDMM = (str) => !str ? '' : `${str.split('-')[2]}/${str.split('-')[1]}`;
    const generateAndCopy = (el, msg) => {
        el.value = msg;
        el.select();
        navigator.clipboard.writeText(msg).then(() => alert('Mensagem copiada!'))
            .catch(() => alert('Falha ao copiar. Copie manualmente.'));
    };

    // --- INICIALIZAÇÃO DOS CAMPOS ---
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    container.querySelector('#cobranca-mes').innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');
    
    let hoursOptions = '';
    for (let i = 8; i <= 21; i++) {
        const hour = String(i).padStart(2, '0') + ':00';
        hoursOptions += `<option value="${hour}">${hour}</option>`;
    }
    container.querySelector('#agendada-hora').innerHTML = hoursOptions;
    container.querySelector('#agendar-hora').innerHTML = hoursOptions.replace(/:00/g, 'h');

    // --- LÓGICA DO ACCORDION ---
    const triggers = container.querySelectorAll('.accordion-trigger');
    triggers.forEach(trigger => {
        trigger.addEventListener('click', function () {
            const isActive = this.classList.contains('active');
            triggers.forEach(t => {
                t.classList.remove('active');
                const c = t.nextElementSibling;
                c.classList.remove('active');
                c.style.maxHeight = null;
            });
            if (!isActive) {
                this.classList.add('active');
                const content = this.nextElementSibling;
                content.classList.add('active');
                content.style.maxHeight = content.scrollHeight + 'px';
            }
        });
    });

    // --- EVENT LISTENERS DOS BOTÕES ---
    container.querySelector('#btn-cobranca').addEventListener('click', function () {
        const p = container.querySelector('#cobranca-paciente').value, d = container.querySelector('#cobranca-data').value, m = container.querySelector('#cobranca-mes').value, v = container.querySelector('#cobranca-valor').value, px = container.querySelector('#cobranca-pix').value;
        const msg = `${getGreeting()}, ${p}!\n\nPassando para lembrar sobre a sua contribuição mensal, com vencimento em *${formatDateToDDMM(d)}*.\n\n*Ao contribuir, você garante a continuidade do seu atendimento e apoia o trabalho da EuPsico.* 😊\n\n*Mês de Referência:* ${m}\n*Valor:* R$ ${v}\n*Chave PIX:* ${px}\n\nQualquer dúvida, estou à disposição.`;
        generateAndCopy(container.querySelector('#output-cobranca'), msg);
    });
    container.querySelector('#btn-agendada').addEventListener('click', function () {
        const tipo = container.querySelector('#agendada-tipo').value, p = container.querySelector('#agendada-paciente').value, t = container.querySelector('#agendada-terapeuta').value, prof = container.querySelector('#agendada-profissao').value, dia = container.querySelector('#agendada-diasemana').value, data = container.querySelector('#agendada-data').value, hora = container.querySelector('#agendada-hora').value;
        let intro = tipo === 'plantao' ? `Meu nome é ${t} e sou o/a ${prof} da EuPsico que irá realizar seu atendimento no Plantão Psicológico.` : `Meu nome é ${t} e sou o/a ${prof} da EuPsico que irá realizar seu atendimento.`;
        let msg = tipo === 'plantao' ? `${getGreeting()}, ${p}!\n\n${intro}\n\nEscrevo para confirmar nossa primeira sessão:\n✨ *${dia}, ${formatDateToDDMM(data)} às ${hora}* ✨\n\nPara que você se sinta mais confortável para o nosso encontro, gostaria de explicar como funciona este acolhimento inicial. O Plantão Psicológico é um *atendimento breve e focado* (de até quatro sessões), onde nosso objetivo será:\n\n➡️ *Identificar sua demanda principal:* Compreender as questões que levaram você a buscar ajuda neste momento.\n➡️ *Avaliar sua necessidade:* Analisar a urgência e a natureza da sua queixa.\n➡️ *Realizar o encaminhamento adequado:* Direcionar você para a modalidade de terapia mais indicada ao final do nosso processo.\n\nDois pontos importantes sobre este formato:\n1. O Plantão funciona como uma porta de entrada. Ele *não é um processo psicoterapêutico completo*, mas sim o primeiro passo para o cuidado contínuo.\n2. Como profissional do Plantão, meu papel é te acolher e direcionar da melhor forma. Por isso, a terapia contínua, se for o caso, será realizada por *outro colega*, garantindo um encaminhamento isento e focado no que é melhor para você.\n\nSou ${prof} com registro profissional, e nosso atendimento é totalmente protegido pelo sigilo e pela ética profissional.\n\nSe tiver qualquer dúvida antes da nossa sessão, pode me perguntar. Estou à disposição para te acolher nesta jornada.` : `${getGreeting()}, ${p}!\n\n${intro}\n\nEscrevo para confirmar nossa primeira sessão:\n✨ *${dia}, ${formatDateToDDMM(data)} às ${hora}* ✨\n\nCaso precise remarcar, por favor, me avise com no mínimo 24 horas de antecedência.\n\nAté lá!`;
        generateAndCopy(container.querySelector('#output-agendada'), msg);
    });
    container.querySelector('#btn-agendar').addEventListener('click', function () {
        const p = container.querySelector('#agendar-paciente').value, t = container.querySelector('#agendar-terapeuta').value, prof = container.querySelector('#agendar-profissao').value, mod = container.querySelector('#agendar-modalidade').value, dia = container.querySelector('#agendar-diasemana').value, hora = container.querySelector('#agendar-hora').value;
        const msg = `${getGreeting()}, ${p}!\n\nSou ${t}, ${prof} na EuPsico.\n\nTenho uma vaga disponível para você no seguinte horário:\n*- Modalidade:* ${mod}\n*- Dia e Hora:* ${dia}, às ${hora}.\n\nEste horário funciona para você?\n\nAguardo sua confirmação para darmos os próximos passos. 😉`;
        generateAndCopy(container.querySelector('#output-agendar'), msg);
    });
    container.querySelector('#btn-primeira').addEventListener('click', function () {
        const p = container.querySelector('#primeira-paciente').value, data = container.querySelector('#primeira-data-agendamento').value, v = container.querySelector('#primeira-valor').value, px = container.querySelector('#primeira-pix').value;
        const msg = `Olá, ${p}! Que bom que o horário funcionou para você.\n\nPara confirmarmos e garantirmos sua vaga, o próximo passo é realizar o pagamento da primeira contribuição.\n\n*Agendamento:* ${formatDateTimeLocalString(data)}\n*Valor:* R$ ${v}\n*Chave PIX:* ${px}\n\n*Prazo para envio do comprovante:* ${getFutureDate(2)}\n\nSeu horário será confirmado assim que recebermos o comprovante. Qualquer dúvida, é só chamar!`;
        generateAndCopy(container.querySelector('#output-primeira'), msg);
    });
}