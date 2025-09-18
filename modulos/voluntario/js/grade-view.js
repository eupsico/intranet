// Arquivo: /modulos/administrativo/js/grade.js
// Versão: 2.3 (DEBUG: Adicionando Logs)

export function init(db, user, userData) {
    console.log("✔️ [ADMIN] Módulo Grade Administrativa: init() chamado.");
    const gradeContent = document.getElementById('grade-content');
    if (!gradeContent) {
        console.error("❌ [ADMIN] Elemento #grade-content não encontrado. Abortando.");
        return;
    }

    let listaProfissionais = [];
    const coresProfissionais = new Map();
    let dadosDasGrades = {};
    const horarios = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"];
    const diasDaSemana = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
    const diasDaSemanaNomes = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const colunasPresencial = ['Leila Tardivo', 'Leonardo Abrahão', 'Karina Okajima Fukumitsu', 'Maria Júlia Kovacs', 'Christian Dunker', 'Maria Célia Malaquias (Grupo)'];
    
    function generateColorFromString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) { hash = str.charCodeAt(i) + ((hash << 5) - hash); }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            let value = (hash >> (i * 8)) & 0xFF;
            value = 100 + (value % 156);
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    }

    function isColorDark(hexColor) {
        if (!hexColor) return false;
        const r = parseInt(hexColor.substr(1, 2), 16);
        const g = parseInt(hexColor.substr(3, 2), 16);
        const b = parseInt(hexColor.substr(5, 2), 16);
        return ((0.299 * r + 0.587 * g + 0.114 * b) / 255) < 0.5;
    }

    function aplicarCor(selectElement) {
        const nomeProfissional = selectElement.value;
        const cor = coresProfissionais.get(nomeProfissional);
        selectElement.style.backgroundColor = cor || '';
        selectElement.style.color = cor ? (isColorDark(cor) ? 'white' : 'black') : '';
    }
    
    function createDropdownOptions() {
        return '<option value=""></option>' + listaProfissionais.map(prof => `<option value="${prof.username}">${prof.username}</option>`).join('');
    }

    function renderGrade(tipo, dia) {
        console.log(`✔️ [ADMIN] renderGrade() chamada para: tipo=${tipo}, dia=${dia}`);
        if (!gradeContent) return;
        gradeContent.innerHTML = '';
        
        const weekTabsNav = document.createElement('div');
        weekTabsNav.className = 'grade-day-tabs';
        diasDaSemanaNomes.forEach((nomeDia, index) => {
            const diaKey = diasDaSemana[index];
            weekTabsNav.innerHTML += `<button class="${dia === diaKey ? 'active' : ''}" data-day="${diaKey}">${nomeDia}</button>`;
        });
        gradeContent.appendChild(weekTabsNav);

        const tableWrapper = document.createElement('div');
        tableWrapper.className = 'table-wrapper';
        const table = document.createElement('table');
        table.className = 'grade-table';
        const thead = document.createElement('thead');
        const tbody = document.createElement('tbody');
        
        let headers = ['Período', 'Horário'];
        headers = headers.concat(tipo === 'online' ? Array(6).fill('Online') : colunasPresencial);
        thead.innerHTML = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;

        horarios.forEach((hora, index) => {
            const row = tbody.insertRow();
            row.className = index < 5 ? 'periodo-manha' : index < 11 ? 'periodo-tarde' : 'periodo-noite';
            
            if (index === 0 || index === 5 || index === 11) {
                const cell = row.insertCell();
                cell.className = 'period-cell';
                cell.setAttribute('data-label', 'Período');
                cell.rowSpan = (index === 5) ? 6 : 5;
                cell.textContent = index < 5 ? 'Manhã' : index < 11 ? 'Tarde' : 'Noite';
            }
            
            const hourCell = row.insertCell();
            hourCell.className = 'hour-cell';
            hourCell.setAttribute('data-label', 'Horário');
            hourCell.textContent = hora;
            
            const columns = tipo === 'online' ? Array(6).fill('Online') : colunasPresencial;
            columns.forEach((headerLabel, i) => {
                const cell = row.insertCell();
                cell.setAttribute('data-label', headerLabel);
                const dropdown = document.createElement('select');
                dropdown.innerHTML = createDropdownOptions();
                const horaFormatada = hora.replace(":", "-");
                const path = `${tipo}.${dia}.${horaFormatada}.col${i}`;
                dropdown.value = dadosDasGrades[path] || '';
                aplicarCor(dropdown);
                cell.appendChild(dropdown);
            });
        });
        table.append(thead, tbody);
        tableWrapper.appendChild(table);
        gradeContent.appendChild(tableWrapper);
        console.log("✔️ [ADMIN] renderGrade() concluída.");
    }

    async function autoSaveChange(selectElement) {
        // ... (código de auto-save sem alterações) ...
    }
    
    function attachEventListeners() {
        // ... (código dos event listeners sem alterações) ...
    }

    async function start() {
        console.log("✔️ [ADMIN] Função start() iniciada.");
        gradeContent.innerHTML = '<div class="loading-spinner"></div>';
        try {
            console.log("✔️ [ADMIN] Buscando profissionais...");
            const q = db.collection("usuarios").where("fazAtendimento", "==", true).orderBy("nome");
            const querySnapshot = await q.get();
            listaProfissionais = querySnapshot.docs.map(doc => doc.data());
            console.log(`✔️ [ADMIN] ${listaProfissionais.length} profissionais encontrados.`);

            listaProfissionais.forEach(prof => {
                const color = prof.cor || generateColorFromString(prof.username);
                coresProfissionais.set(prof.username, color);
            });

            const gradesDocRef = db.collection('administrativo').doc('grades');
            
            console.log("✔️ [ADMIN] Buscando dados da grade pela primeira vez com .get()");
            const doc = await gradesDocRef.get();
            dadosDasGrades = doc.exists ? doc.data() : {};
            console.log(`✔️ [ADMIN] Dados da grade carregados. Documento existe: ${doc.exists}`);
            
            console.log("✔️ [ADMIN] Chamando renderGrade() pela primeira vez.");
            renderGrade('online', 'segunda'); 
            attachEventListeners();
            
            console.log("✔️ [ADMIN] Anexando listener onSnapshot para atualizações futuras.");
            gradesDocRef.onSnapshot((doc) => {
                console.log("✔️ [ADMIN] onSnapshot foi acionado por uma atualização!");
                dadosDasGrades = doc.exists ? doc.data() : {};
                const mainTabsContainer = document.querySelector('#grade-main-tabs');
                if (!mainTabsContainer) return;
                const activeMainTabEl = mainTabsContainer.querySelector('button.active');
                const activeDayTabEl = gradeContent.querySelector('.grade-day-tabs button.active');
                if (activeMainTabEl && activeDayTabEl) {
                    renderGrade(activeMainTabEl.dataset.tab, activeDayTabEl.dataset.day);
                }
            }, (error) => {
                console.error("❌ [ADMIN] ERRO no listener onSnapshot:", error);
            });

        } catch (error) {
            console.error("❌ [ADMIN] ERRO fatal no start():", error);
            gradeContent.innerHTML = `<p class="alert alert-error">Erro ao carregar dados. Verifique o console.</p>`;
        }
    }

    start();
}