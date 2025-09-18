// Arquivo: /modulos/voluntario/js/tabs/grade.js
// Versão: 2.0
// Descrição: Módulo refatorado para exibir a grade administrativa em tempo real.

export async function init(db, user, userData) {
    const mainContainer = document.querySelector('#grade');
    if (!mainContainer) return;

    // --- VARIÁVEIS DE ESTADO E CONSTANTES ---
    const gradeContent = mainContainer.querySelector('#grade-content-voluntario');
    const coresProfissionais = new Map();
    let dadosDasGrades = {}; // Cache local dos dados da grade
    const horarios = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
    const diasDaSemana = {segunda: 'Segunda-feira', terca: 'Terça-feira', quarta: 'Quarta-feira', quinta: 'Quinta-feira', sexta: 'Sexta-feira', sabado: 'Sábado'};
    const colunasPresencial = ['Leila Tardivo', 'Leonardo Abrahão', 'Karina Okajima Fukumitsu', 'Maria Júlia Kovacs', 'Christian Dunker', 'Maria Célia Malaquias (Grupo)'];

    // --- FUNÇÕES AUXILIARES ---
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
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    };
    
    // --- LÓGICA DE RENDERIZAÇÃO ---
    function renderGrade(tipo, dia) {
        if (!gradeContent) return;

        // Monta os cabeçalhos da tabela
        let headers = ['Período', 'Horário'];
        headers = headers.concat(tipo === 'online' ? Array(6).fill('Online') : colunasPresencial);
        const headersHtml = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

        // Monta as linhas da tabela
        const bodyHtml = horarios.map((hora, index) => {
            const horaFormatada = hora.replace(":", "-");
            let periodoCell = '';
            if (index === 0) periodoCell = `<td class="period-cell" rowspan="5">Manhã</td>`;
            if (index === 5) periodoCell = `<td class="period-cell" rowspan="6">Tarde</td>`;
            if (index === 11) periodoCell = `<td class="period-cell" rowspan="5">Noite</td>`;

            const celulasProfissionais = headers.slice(2).map((_, colIndex) => {
                const nomeProfissional = dadosDasGrades?.[tipo]?.[dia]?.[horaFormatada]?.[`col${colIndex}`] || '';
                const cor = coresProfissionais.get(nomeProfissional);
                const estilo = cor ? `style="background-color: ${cor}; color: ${isColorDark(cor) ? 'white' : 'black'};"` : '';
                return `<td class="${nomeProfissional ? 'filled' : ''}" ${estilo}>${nomeProfissional}</td>`;
            }).join('');

            let rowClass = '';
            if (index < 5) rowClass = 'periodo-manha';
            else if (index < 11) rowClass = 'periodo-tarde';
            else rowClass = 'periodo-noite';

            return `<tr class="${rowClass}">${periodoCell}<td class="hour-cell">${hora}</td>${celulasProfissionais}</tr>`;
        }).join('');
        
        // Monta o HTML final e injeta no container
        gradeContent.innerHTML = `
            <div class="grade-day-tabs">
                ${Object.entries(diasDaSemana).map(([key, nome]) => `<button class="${dia === key ? 'active' : ''}" data-day="${key}">${nome}</button>`).join('')}
            </div>
            <div class="table-wrapper-voluntario">
                <table class="grade-table-voluntario">
                    <thead>${headersHtml}</thead>
                    <tbody>${bodyHtml}</tbody>
                </table>
            </div>
        `;
    }

    // --- ATRIBUIÇÃO DE EVENTOS ---
    function attachEventListeners() {
        mainContainer.addEventListener('click', (e) => {
            const mainTabButton = e.target.closest('#grade-main-tabs-voluntario button');
            const dayTabButton = e.target.closest('.grade-day-tabs button');

            if (mainTabButton) {
                mainContainer.querySelectorAll('#grade-main-tabs-voluntario button').forEach(b => b.classList.remove('active'));
                mainTabButton.classList.add('active');
                renderGrade(mainTabButton.dataset.tab, 'segunda'); // Volta para segunda ao trocar modalidade
            }
            if (dayTabButton) {
                const activeMainTab = mainContainer.querySelector('#grade-main-tabs-voluntario button.active').dataset.tab;
                renderGrade(activeMainTab, dayTabButton.dataset.day);
            }
        });
    }

    // --- INICIALIZAÇÃO E BUSCA DE DADOS ---
    async function start() {
        try {
            // 1. Busca as informações dos profissionais (nome e cor) uma única vez
            const querySnapshot = await db.collection("usuarios").where("fazAtendimento", "==", true).get();
            querySnapshot.forEach(doc => {
                const prof = doc.data();
                const color = prof.cor || generateColorFromString(prof.username);
                coresProfissionais.set(prof.username, color);
            });
            
            attachEventListeners();

            // 2. Inicia o listener em tempo real no documento da grade
            const gradesDocRef = db.collection('administrativo').doc('grades');
            gradesDocRef.onSnapshot((doc) => {
                console.log("Dados da grade atualizados em tempo real.");
                dadosDasGrades = doc.exists ? doc.data() : {};
                
                // Re-renderiza a view atual com os novos dados
                const activeMainTabEl = mainContainer.querySelector('#grade-main-tabs-voluntario button.active');
                const activeDayTabEl = gradeContent.querySelector('.grade-day-tabs button.active');
                
                const currentTipo = activeMainTabEl ? activeMainTabEl.dataset.tab : 'online';
                const currentDia = activeDayTabEl ? activeDayTabEl.dataset.day : 'segunda';

                renderGrade(currentTipo, currentDia);

            }, (error) => {
                console.error("Erro ao escutar as atualizações da grade:", error);
                gradeContent.innerHTML = `<p class="alert alert-error">Erro de conexão. Não foi possível carregar a grade em tempo real.</p>`;
            });

        } catch (error) {
            console.error("Erro ao inicializar a grade do voluntário:", error);
            gradeContent.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados da grade.</p>`;
        }
    }

    await start();
}