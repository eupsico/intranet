// Arquivo: /modulos/voluntario/js/grade.js
// Versão: 5.0 (Final)
// Descrição: Lógica recriada a partir do painel administrativo para garantir
// consistência visual e funcional, com resumo semanal integrado.

export async function init(db, user, userData) {
    // --- ELEMENTOS E VARIÁVEIS GLOBAIS ---
    const mainContainer = document.querySelector('#grade');
    if (!mainContainer) return;

    const summaryDetails = mainContainer.querySelector('#summary-details-voluntario');
    const gradeContent = mainContainer.querySelector('#grade-content-voluntario');
    
    const coresProfissionais = new Map();
    let dadosDasGrades = {};

    const horarios = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
    const diasDaSemana = {segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado'};
    const colunasPresencial = ['Leila Tardivo', 'Leonardo Abrahão', 'Karina Okajima Fukumitsu', 'Maria Júlia Kovacs', 'Christian Dunker', 'Maria Célia Malaquias (Grupo)'];

    // --- FUNÇÕES AUXILIARES ---
    function generateColorFromString(str) {
        if (!str || str.length === 0) return '#ffffff'; // Retorna branco para strings vazias
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            value = 120 + (value % 136); // Gera cores mais claras e agradáveis
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    function isColorDark(hexColor) {
        if (!hexColor) return false;
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) < 0.6; // Limite ajustado para boa legibilidade
    }

    // --- RENDERIZAÇÃO E CÁLCULOS ---
    function calculateAndShowSummary() {
        if (!userData || !userData.username) {
            summaryDetails.innerHTML = '<p>Não foi possível identificar o usuário para exibir o resumo.</p>';
            return;
        }
        
        const userUsername = userData.username;
        const userFullName = userData.name;
        let horasOnline = 0, horasPresencial = 0;
        let agendamentosOnline = [], agendamentosPresencial = [];
        
        ['online', 'presencial'].forEach(tipo => {
            if (dadosDasGrades[tipo]) {
                Object.entries(diasDaSemana).forEach(([diaKey, diaNome]) => {
                    if (dadosDasGrades[tipo][diaKey]) {
                        Object.entries(dadosDasGrades[tipo][diaKey]).forEach(([hora, cols]) => {
                            Object.values(cols).forEach(nomeDaGrade => {
                                if (nomeDaGrade === userUsername || nomeDaGrade === userFullName) {
                                    const horaFormatada = hora.replace('-', ':');
                                    if (tipo === 'online') {
                                        horasOnline++;
                                        agendamentosOnline.push(`<li>${diaNome} - ${horaFormatada}</li>`);
                                    } else {
                                        horasPresencial++;
                                        agendamentosPresencial.push(`<li>${diaNome} - ${horaFormatada}</li>`);
                                    }
                                }
                            });
                        });
                    }
                });
            }
        });

        summaryDetails.innerHTML = `
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
            </div>`;
    }

    function renderGrade(tipo, dia) {
        let headers = ['Período', 'Horário'];
        headers = headers.concat(tipo === 'online' ? Array(6).fill('Online') : colunasPresencial);

        const tableBodyHtml = horarios.map((hora, index) => {
            const horaFormatada = hora.replace(":", "-");
            let periodoCell = '';
            if (index === 0) periodoCell = `<td class="period-cell" rowspan="5">Manhã</td>`;
            if (index === 5) periodoCell = `<td class="period-cell" rowspan="6">Tarde</td>`;
            if (index === 11) periodoCell = `<td class="period-cell" rowspan="5">Noite</td>`;

            const celulasProfissionais = headers.slice(2).map((_, colIndex) => {
                const nomeDaGrade = dadosDasGrades?.[tipo]?.[dia]?.[horaFormatada]?.[`col${colIndex}`] || '';
                const cor = coresProfissionais.get(nomeDaGrade) || generateColorFromString(nomeDaGrade);
                const textColor = isColorDark(cor) ? 'var(--cor-texto-inverso)' : 'var(--cor-texto-principal)';
                const estilo = nomeDaGrade ? `background-color: ${cor}; color: ${textColor};` : '';
                
                const isCurrentUser = nomeDaGrade && (nomeDaGrade === userData.username || nomeDaGrade === userData.name);
                
                return `<td><div class="professional-cell ${isCurrentUser ? 'user-highlight' : ''}" style="${estilo}">${nomeDaGrade}</div></td>`;
            }).join('');
            
            let rowClass = '';
            if (index < 5) rowClass = 'periodo-manha';
            else if (index < 11) rowClass = 'periodo-tarde';
            else rowClass = 'periodo-noite';

            return `<tr class="${rowClass}">${periodoCell}<td class="hour-cell">${hora}</td>${celulasProfissionais}</tr>`;
        }).join('');

        gradeContent.innerHTML = `
            <div class="grade-day-tabs">
                ${Object.entries(diasDaSemana).map(([key, nome]) => `<button class="${dia === key ? 'active' : ''}" data-day="${key}">${nome}</button>`).join('')}
            </div>
            <div class="table-wrapper">
                <table class="grade-table">
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>${tableBodyHtml}</tbody>
                </table>
            </div>`;
    }
    
    // --- EVENTOS E INICIALIZAÇÃO ---
    function attachEventListeners() {
        mainContainer.addEventListener('click', (e) => {
            const mainTabButton = e.target.closest('#grade-main-tabs-voluntario .tab-link');
            const dayTabButton = e.target.closest('.grade-day-tabs button');

            if (mainTabButton) {
                mainContainer.querySelectorAll('#grade-main-tabs-voluntario .tab-link').forEach(b => b.classList.remove('active'));
                mainTabButton.classList.add('active');
                renderGrade(mainTabButton.dataset.tab, 'segunda'); 
            }
            if (dayTabButton) {
                const activeMainTab = mainContainer.querySelector('#grade-main-tabs-voluntario .tab-link.active').dataset.tab;
                renderGrade(activeMainTab, dayTabButton.dataset.day);
            }
        });
    }

    async function start() {
        try {
            gradeContent.innerHTML = '<div class="loading-spinner"></div>';
            summaryDetails.innerHTML = '<div class="loading-spinner-small"></div>';
            
            const usuariosSnapshot = await db.collection("usuarios").where("fazAtendimento", "==", true).get();
            usuariosSnapshot.forEach(doc => {
                const prof = doc.data();
                const cor = prof.cor || generateColorFromString(prof.username);
                if (prof.username) coresProfissionais.set(prof.username, cor);
                if (prof.name) coresProfissionais.set(prof.name, cor); // Mapeia cor para ambos
            });
            
            const gradesDocRef = db.collection('administrativo').doc('grades');
            gradesDocRef.onSnapshot((doc) => {
                dadosDasGrades = doc.exists ? doc.data() : {};
                calculateAndShowSummary();
                
                const activeMainTabEl = mainContainer.querySelector('#grade-main-tabs-voluntario .tab-link.active');
                const activeDayTabEl = gradeContent.querySelector('.grade-day-tabs button.active');
                
                const currentTipo = activeMainTabEl ? activeMainTabEl.dataset.tab : 'online';
                const currentDia = activeDayTabEl ? activeDayTabEl.dataset.day : 'segunda';

                renderGrade(currentTipo, currentDia);

            }, (error) => {
                console.error("Erro ao escutar atualizações da grade:", error);
                gradeContent.innerHTML = `<p class="alert alert-error">Erro de conexão.</p>`;
            });
            
            attachEventListeners();

        } catch (error) {
            console.error("Erro fatal ao inicializar a grade:", error);
            gradeContent.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados da grade.</p>`;
        }
    }

    await start();
}