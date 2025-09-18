export function init(db, user, userData) {
    const summaryContainer = document.getElementById('summary-panel-container');
    const infoCardContainer = document.getElementById('info-card-container');

    if (!summaryContainer || !infoCardContainer) return;

    // Objeto para armazenar os dados da grade e evitar múltiplas leituras
    let dadosDasGrades = {};
    const diasDaSemana = {segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado'};

    /**
     * NOVO: Renderiza o painel "Meu Resumo Semanal" em tempo real.
     */
    function renderSummaryPanel() {
        if (!userData || !userData.username) {
            summaryContainer.innerHTML = '<p>Não foi possível identificar o usuário para exibir o resumo.</p>';
            return;
        }
        
        const userUsername = userData.username;
        const userFullName = userData.name;
        let horasOnline = 0, horasPresencial = 0;
        let agendamentosOnline = [], agendamentosPresencial = [];
        
        for (const path in dadosDasGrades) {
            const nomeDaGrade = dadosDasGrades[path];
            if (nomeDaGrade === userUsername || nomeDaGrade === userFullName) {
                const parts = path.split('.');
                if (parts.length === 4) {
                    const tipo = parts[0];
                    const diaKey = parts[1];
                    const horaFormatada = parts[2].replace('-', ':');
                    const diaNome = diasDaSemana[diaKey];
                    
                    if (tipo === 'online') {
                        horasOnline++;
                        agendamentosOnline.push(`<li>${diaNome} - ${horaFormatada}</li>`);
                    } else if (tipo === 'presencial') {
                        horasPresencial++;
                        agendamentosPresencial.push(`<li>${diaNome} - ${horaFormatada}</li>`);
                    }
                }
            }
        }

        summaryContainer.innerHTML = `
            <div class="summary-panel">
                <h3>Meu Resumo Semanal</h3>
                <div id="summary-details-container">
                    <div class="summary-card">
                        <h4>Horas Totais</h4>
                        <ul><li><strong>Total:</strong> ${horasOnline + horasPresencial} horas</li></ul>
                    </div>
                    <div class="summary-card">
                        <h4>Agendamentos Online (${horasOnline})</h4>
                        <ul>${agendamentosOnline.length > 0 ? agendamentosOnline.join('') : '<li>Nenhum horário online.</li>'}</ul>
                    </div>
                    <div class="summary-card">
                        <h4>Agendamentos Presenciais (${horasPresencial})</h4>
                        <ul>${agendamentosPresencial.length > 0 ? agendamentosPresencial.join('') : '<li>Nenhum horário presencial.</li>'}</ul>
                    </div>
                </div>
            </div>`;
    }

    /**
     * Renderiza os cards de informações gerais (Avisos, etc.).
     */
    async function renderInfoCard() {
        // A lógica de Avisos Gerais permanece a mesma
        const aniversariantesHtml = `<li>Nenhum aniversariante hoje.</li>`;
        const reuniaoHtml = `<li>Nenhuma reunião agendada.</li>`;

        // ATENÇÃO: A lógica de "Seus Atendimentos" ainda é estática.
        // Precisará ser implementada futuramente para buscar dados reais.
        const atendimentosHtml = `
            <li>Você tem <strong>X</strong> atendimentos agendados para esta semana.</li>
            <li>Seu próximo horário vago é na <strong>Y</strong>.</li>`;

        infoCardContainer.innerHTML = `
            <div class="info-card-grid">
                <div class="info-card">
                    <h3>📅 Seus Atendimentos</h3>
                    <ul>${atendimentosHtml}</ul>
                </div>
                <div class="info-card">
                    <h3>📢 Avisos Gerais</h3>
                    <ul>
                        ${aniversariantesHtml}
                        ${reuniaoHtml}
                    </ul>
                </div>
            </div>`;
    }

    // --- INICIALIZAÇÃO ---
    async function start() {
        summaryContainer.innerHTML = '<div class="loading-spinner"></div>';
        renderInfoCard(); // Renderiza os cards estáticos imediatamente

        // Inicia o listener em tempo real para a grade, que alimenta o resumo
        const gradesDocRef = db.collection('administrativo').doc('grades');
        gradesDocRef.onSnapshot((doc) => {
            dadosDasGrades = doc.exists ? doc.data() : {};
            renderSummaryPanel(); // Re-renderiza o resumo sempre que a grade mudar
        }, (error) => {
            console.error("Erro ao carregar resumo da grade:", error);
            summaryContainer.innerHTML = `<p class="alert alert-error">Não foi possível carregar o resumo semanal.</p>`;
        });
    }

    start().catch(console.error);
}