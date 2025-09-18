// Arquivo: /modulos/voluntario/js/grade.js
// Versão: 3.3 (Final)
// Descrição: Resolve o problema de dados vazios com uma comparação de nomes mais robusta.

const generateColorFromString = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;
        value = 100 + (value % 156);
        color += ('00' + value.toString(16)).substr(-2);
    }
    return color;
};

const isColorDark = (hexColor) => {
    if (!hexColor) return false;
    const r = parseInt(hexColor.substr(1, 2), 16);
    const g = parseInt(hexColor.substr(3, 2), 16);
    const b = parseInt(hexColor.substr(5, 2), 16);
    return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) < 0.5;
};

export async function init(db, user, userData) {
    const mainContainer = document.querySelector('#grade');
    if (!mainContainer) return;

    const gradeContent = mainContainer.querySelector('#grade-content-voluntario');
    const summaryDetails = mainContainer.querySelector('#summary-details-voluntario');
    
    let dadosDasGrades = {};
    const coresProfissionais = new Map();
    
    const horarios = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
    const diasDaSemana = {segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado'};
    const colunasPresencial = ['Leila Tardivo', 'Leonardo Abrahão', 'Karina Okajima Fukumitsu', 'Maria Júlia Kovacs', 'Christian Dunker', 'Maria Célia Malaquias (Grupo)'];

    /**
     * Normaliza uma string: remove espaços extras e converte para minúsculas.
     * @param {string} str O nome a ser normalizado.
     * @returns {string} O nome normalizado.
     */
    const normalizeName = (str) => (str || '').trim().toLowerCase();

    function calculateAndShowSummary() {
        if (!userData || !userData.username) {
            summaryDetails.innerHTML = '<p>Não foi possível identificar o usuário para exibir o resumo.</p>';
            return;
        }
        
        // CORREÇÃO: Normaliza o nome do usuário logado para a comparação.
        const nomeProfissionalNormalizado = normalizeName(userData.username);
        let horasOnline = 0, horasPresencial = 0;
        let agendamentosOnline = [], agendamentosPresencial = [];
        
        ['online', 'presencial'].forEach(tipo => {
            if (dadosDasGrades[tipo]) {
                Object.entries(diasDaSemana).forEach(([diaKey, diaNome]) => {
                    if (dadosDasGrades[tipo][diaKey]) {
                        Object.entries(dadosDasGrades[tipo][diaKey]).forEach(([hora, cols]) => {
                            Object.values(cols).forEach(nomeDaGrade => {
                                // CORREÇÃO: Compara os nomes normalizados.
                                if (normalizeName(nomeDaGrade) === nomeProfissionalNormalizado) {
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

    function createGradeTableHTML(tipo, dia) {
        const headers = ['Horário', ...(tipo === 'online' ? Array(6).fill('Online') : colunasPresencial)];
        const gradeData = dadosDasGrades?.[tipo]?.[dia] || {};
        const nomeProfissionalNormalizado = normalizeName(userData.username);

        const bodyHtml = horarios.map(hora => {
            const horaFormatada = hora.replace(":", "-");
            const celulasProfissionais = headers.slice(1).map((_, colIndex) => {
                const nomeDaGrade = gradeData[horaFormatada]?.[`col${colIndex}`] || '';
                const cor = coresProfissionais.get(nomeDaGrade); // Pega a cor pelo nome original
                const estilo = cor ? `style="background-color: ${cor}; color: ${isColorDark(cor) ? 'white' : 'black'};"` : '';
                
                // CORREÇÃO: Compara os nomes normalizados para o destaque.
                const isCurrentUser = nomeDaGrade && (normalizeName(nomeDaGrade) === nomeProfissionalNormalizado);
                
                return `<td class="${nomeDaGrade ? 'filled' : ''} ${isCurrentUser ? 'user-highlight' : ''}" ${estilo}>${nomeDaGrade}</td>`;
            }).join('');
            return `<tr><td class="hour-cell">${hora}</td>${celulasProfissionais}</tr>`;
        }).join('');

        return `
            <div class="table-wrapper-voluntario">
                <table class="grade-table-voluntario">
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>`;
    }

    function renderFullAccordions() {
        const mainTypes = [{key: 'online', name: 'Grade Online'}, {key: 'presencial', name: 'Grade Presencial'}];
        let accordionsHtml = mainTypes.map(type => `
            <div class="accordion">
                <button class="accordion-trigger main-trigger">${type.name}</button>
                <div class="accordion-content main-content">
                    ${Object.entries(diasDaSemana).map(([diaKey, nomeDia]) => `
                        <div class="accordion">
                            <button class="accordion-trigger day-trigger" data-tipo="${type.key}" data-dia="${diaKey}">${nomeDia}</button>
                            <div class="accordion-content day-content"></div>
                        </div>`).join('')}
                </div>
            </div>`).join('');
        gradeContent.innerHTML = accordionsHtml;
    }

    function attachEventListeners() {
        gradeContent.addEventListener('click', function(e) {
            const trigger = e.target.closest('.accordion-trigger');
            if (!trigger) return;
            const content = trigger.nextElementSibling;
            const isActive = trigger.classList.contains('active');
            const parentContainer = trigger.parentElement.parentElement;
            parentContainer.querySelectorAll(':scope > .accordion > .accordion-trigger').forEach(t => {
                if (t !== trigger) {
                    t.classList.remove('active');
                    t.nextElementSibling.style.maxHeight = null;
                }
            });
            trigger.classList.toggle('active', !isActive);
            if (!isActive) {
                if (trigger.classList.contains('day-trigger') && content.innerHTML.trim() === '') {
                    content.innerHTML = createGradeTableHTML(trigger.dataset.tipo, trigger.dataset.dia);
                }
                content.style.maxHeight = content.scrollHeight + 'px';
            } else {
                content.style.maxHeight = null;
            }
            const grandParentContent = parentContainer.closest('.accordion-content');
            if (grandParentContent) {
                setTimeout(() => { grandParentContent.style.maxHeight = grandParentContent.scrollHeight + 'px'; }, 400);
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
                // Usa o nome original (com maiúsculas/minúsculas) para o mapa de cores
                coresProfissionais.set(prof.username, prof.cor || generateColorFromString(prof.username));
            });
            
            const gradesDocRef = db.collection('administrativo').doc('grades');
            gradesDocRef.onSnapshot((doc) => {
                dadosDasGrades = doc.exists ? doc.data() : {};
                
                if (!gradeContent.querySelector('.accordion')) {
                    renderFullAccordions();
                }
                calculateAndShowSummary();
                const openDayContent = gradeContent.querySelector('.accordion-content.day-content.active');
                if (openDayContent) {
                    const trigger = openDayContent.previousElementSibling;
                    openDayContent.innerHTML = createGradeTableHTML(trigger.dataset.tipo, trigger.dataset.dia);
                    openDayContent.style.maxHeight = openDayContent.scrollHeight + 'px';
                }
            }, (error) => {
                console.error("[GRADE] Erro ao escutar atualizações da grade:", error);
                gradeContent.innerHTML = `<p class="alert alert-error">Erro de conexão. Não foi possível carregar a grade em tempo real.</p>`;
            });
            attachEventListeners();
        } catch (error) {
            console.error("[GRADE] Erro fatal ao inicializar:", error);
            gradeContent.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados da grade.</p>`;
        }
    }

    await start();
}