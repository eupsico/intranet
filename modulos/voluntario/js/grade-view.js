// Arquivo: /modulos/voluntario/js/grade-view.js
// Versão: 2.2 (Adiciona classes específicas para grades online/presencial)
// Descrição: Permite a estilização customizada de cada tipo de grade no CSS.

// --- FUNÇÕES AUXILIARES GLOBAIS ---
function generateColorFromString(str) {
    if (!str || str.length === 0) return '#ff0055'; // cor vibrante padrão

    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    let color = '#';
    for (let i = 0; i < 3; i++) {
        let value = (hash >> (i * 8)) & 0xFF;

        // Garante que o valor fique entre 160 e 255 (faixa vibrante)
        value = 160 + (value % 96);

        color += ('00' + value.toString(16)).slice(-2);
    }

    return color;
}

function isColorDark(hexColor) {
    if (!hexColor || hexColor.length !== 7) return false;

    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Fórmula de luminosidade perceptual
    const brightness = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Novo limiar para cores vibrantes
    return brightness < 0.5;
}

// --- FUNÇÃO DE INICIALIZAÇÃO DO MÓDULO ---
export async function init(db, user, userData, tipoGrade) {
    const containerId = `grade-${tipoGrade}`;
    const gradeContent = document.getElementById(containerId);
    if (!gradeContent) return;

    const coresProfissionais = new Map();
    let dadosDasGrades = {};

    const horarios = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
    const diasDaSemana = {segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado'};
    const colunasPresencial = ['Leila Tardivo', 'Leonardo Abrahão', 'Karina Okajima Fukumitsu', 'Maria Júlia Kovacs', 'Christian Dunker', 'Maria Célia Malaquias (Grupo)'];

    function renderGrade(dia) {
        let headers = ['Período', 'HORAS'];
        headers = headers.concat(tipoGrade === 'online' ? Array(6).fill('Online') : colunasPresencial);

        const tableBodyHtml = horarios.map((hora, index) => {
            const horaFormatada = hora.replace(":", "-");
            let periodoCell = '';
            
            if (index === 0) periodoCell = `<td data-label="Período" class="period-cell" rowspan="5">Manhã</td>`;
            if (index === 5) periodoCell = `<td data-label="Período" class="period-cell" rowspan="6">Tarde</td>`;
            if (index === 11) periodoCell = `<td data-label="Período" class="period-cell" rowspan="5">Noite</td>`;

            // --- INÍCIO DA CORREÇÃO ---
            const celulasProfissionais = headers.slice(2).map((headerLabel, colIndex) => {
                const path = `${tipoGrade}.${dia}.${horaFormatada}.col${colIndex}`;
                const nomeDaGrade = dadosDasGrades[path] || '';
                
                const isEmpty = !nomeDaGrade;
                const cellClass = isEmpty ? 'cell-empty' : '';

                const cor = coresProfissionais.get(nomeDaGrade) || generateColorFromString(nomeDaGrade);
                const textColor = isColorDark(cor) ? 'var(--cor-texto-inverso)' : 'var(--cor-texto-principal)';
                const estilo = !isEmpty ? `background-color: ${cor}; color: ${textColor};` : '';
                const isCurrentUser = !isEmpty && (nomeDaGrade === userData.username || nomeDaGrade === userData.name);
                
                return `<td data-label="${headerLabel}" class="${cellClass}"><div class="professional-cell ${isCurrentUser ? 'user-highlight' : ''}" style="${estilo}">${nomeDaGrade}</div></td>`;
            }).join('');
            // --- FIM DA CORREÇÃO ---
            
            let rowClass = '';
            if (index < 5) rowClass = 'periodo-manha';
            else if (index < 11) rowClass = 'periodo-tarde';
            else rowClass = 'periodo-noite';

            const horaSimples = hora.replace(':00', 'h');
            return `<tr class="${rowClass}">${periodoCell}<td class="hour-cell" data-label="HORAS">${horaSimples}</td>${celulasProfissionais}</tr>`;
        }).join('');

        gradeContent.innerHTML = `
            <div class="grade-day-tabs-wrapper">
                ${Object.entries(diasDaSemana).map(([key, nome]) => `<button class="${dia === key ? 'active' : ''}" data-day="${key}">${nome}</button>`).join('')}
            </div>
            <div class="table-wrapper">
                <table class="grade-table grade-${tipoGrade}">
                    <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
                    <tbody>${tableBodyHtml}</tbody>
                </table>
            </div>`;
    }
    
    function attachEventListeners() {
        gradeContent.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && e.target.closest('.grade-day-tabs-wrapper')) {
                renderGrade(e.target.dataset.day);
            }
        });
    }

    async function start() {
        try {
            gradeContent.innerHTML = '<div class="loading-spinner"></div>';
            
            const usuariosSnapshot = await db.collection("usuarios").where("fazAtendimento", "==", true).get();
            usuariosSnapshot.forEach(doc => {
                const prof = doc.data();
                const cor = prof.cor || generateColorFromString(prof.username);
                if (prof.username) coresProfissionais.set(prof.username, cor);
                if (prof.name) coresProfissionais.set(prof.name, cor);
            });
            
            const gradesDocRef = db.collection('administrativo').doc('grades');
            gradesDocRef.onSnapshot((doc) => {
                dadosDasGrades = doc.exists ? doc.data() : {};
                const activeDayTabEl = gradeContent.querySelector('.grade-day-tabs-wrapper button.active');
                const currentDia = activeDayTabEl ? activeDayTabEl.dataset.day : 'segunda';
                renderGrade(currentDia);
            }, (error) => {
                console.error("Erro ao escutar atualizações da grade:", error);
                gradeContent.innerHTML = `<p class="alert alert-error">Erro de conexão.</p>`;
            });
            
            attachEventListeners();
        } catch (error) {
            console.error(`Erro fatal ao inicializar a grade ${tipoGrade}:`, error);
            gradeContent.innerHTML = `<p class="alert alert-error">Não foi possível carregar a grade.</p>`;
        }
    }

    await start();
}