// Arquivo: /modulos/voluntario/js/disponibilidade.js
// Descrição: Módulo para a aba "Minha Disponibilidade".

export function init(db, user, userData) {
    const container = document.querySelector('#disponibilidade-container');
    if (!container) return;
    
    async function fetchData() {
        container.innerHTML = '<div class="loading-spinner"></div>';
        try {
            const userDoc = await db.collection('usuarios').doc(user.uid).get();
            if (userDoc.exists) {
                renderUserView(userDoc.data());
            } else {
                container.innerHTML = `<div class="disponibilidade-view"><h3>Minha Disponibilidade</h3><p>Seus dados não foram encontrados.</p></div>`;
            }
        } catch(error) {
            console.error("Erro ao buscar dados de disponibilidade:", error);
            container.innerHTML = `<p class="alert alert-error">Não foi possível carregar os dados.</p>`;
        }
    }
    
    function renderUserView(profData) {
        const horariosHtml = profData.horarios && profData.horarios.length > 0
            ? profData.horarios.map(h => `<li><strong>${h.dia.charAt(0).toUpperCase() + h.dia.slice(1)} - ${String(h.horario).padStart(2,'0')}:00:</strong> ${h.modalidade} (${h.status})</li>`).join('')
            : '<li>Nenhum horário cadastrado.</li>';

        container.innerHTML = `
            <div class="disponibilidade-view">
                <div class="display-header">
                    <h3>Horários Salvos</h3>
                    <button class="action-button modify-btn">Modificar</button>
                </div>
                <div class="display-body">
                    <ul class="schedule-list">${horariosHtml}</ul>
                    <div class="demands-display">
                        <h4>Demandas que NÃO atende:</h4>
                        <p>${profData.demandasNaoAtendidas || 'Nenhuma restrição informada.'}</p>
                    </div>
                </div>
            </div>
        `;
        container.querySelector('.modify-btn').addEventListener('click', () => renderEditView(profData));
    }

    function createNewScheduleRowHtml() {
        const dias = {segunda:"Segunda-feira", terca:"Terça-feira", quarta:"Quarta-feira", quinta:"Quinta-feira", sexta:"Sexta-feira", sabado:"Sábado"};
        const horarios = Array.from({length: 15}, (_, i) => i + 7); // 7h às 21h
        
        return `
            <tr>
                <td><select class="dia">${Object.entries(dias).map(([val, text]) => `<option value="${val}">${text}</option>`).join('')}</select></td>
                <td><select class="horario">${horarios.map(hora => `<option value="${hora}">${String(hora).padStart(2,'0')}:00</option>`).join('')}</select></td>
                <td><select class="modalidade"><option value="online">Online</option><option value="presencial">Presencial</option><option value="ambas">Ambas</option></select></td>
                <td><select class="status"><option value="disponivel">Disponível</option><option value="ocupado">Ocupado</option></select></td>
                <td><button class="delete-row-btn">Excluir</button></td>
            </tr>
        `;
    }

    function renderEditView(profData) {
        const scheduleRowsHtml = (profData.horarios && profData.horarios.length > 0 ? profData.horarios : [])
        .map(h => {
            const dias = {segunda:"Segunda-feira", terca:"Terça-feira", quarta:"Quarta-feira", quinta:"Quinta-feira", sexta:"Sexta-feira", sabado:"Sábado"};
            const horarios = Array.from({length: 15}, (_, i) => i + 7); // 7h às 21h
            return `
            <tr>
                <td><select class="dia">${Object.entries(dias).map(([val, text]) => `<option value="${val}" ${h.dia === val ? 'selected' : ''}>${text}</option>`).join('')}</select></td>
                <td><select class="horario">${horarios.map(hora => `<option value="${hora}" ${h.horario == hora ? 'selected' : ''}>${String(hora).padStart(2,'0')}:00</option>`).join('')}</select></td>
                <td><select class="modalidade"><option value="online" ${h.modalidade === 'online' ? 'selected' : ''}>Online</option><option value="presencial" ${h.modalidade === 'presencial' ? 'selected' : ''}>Presencial</option><option value="ambas" ${h.modalidade === 'ambas' ? 'selected' : ''}>Ambas</option></select></td>
                <td><select class="status"><option value="disponivel" ${h.status === 'disponivel' ? 'selected' : ''}>Disponível</option><option value="ocupado" ${h.status === 'ocupado' ? 'selected' : ''}>Ocupado</option></select></td>
                <td><button class="delete-row-btn">Excluir</button></td>
            </tr>
        `}).join('');
        
        container.innerHTML = `
            <div class="disponibilidade-view">
                <h3>Editando Minha Disponibilidade</h3>
                <p class="description-box">Como a EuPsico não trabalha somente com voluntários, é preciso que cada um assuma a responsabilidade de informar a sua disponibilidade correta para o setor administrativo.</p>
                <table class="edit-table">
                    <thead><tr><th>Dia da Semana</th><th>Horário</th><th>Modalidade</th><th>Status</th><th>Ação</th></tr></thead>
                    <tbody>${scheduleRowsHtml}</tbody>
                </table>
                <button class="action-button add-row-btn">Adicionar Horário (+)</button>
                <hr style="margin: 20px 0;">
                <div class="form-group">
                    <label for="demands-textarea">Demandas que NÃO atende:</label>
                    <textarea id="demands-textarea" class="demands" placeholder="Ex: Crianças abaixo de 10 anos, casos de abuso sexual, etc.">${profData.demandasNaoAtendidas || ''}</textarea>
                </div>
                <div class="edit-controls">
                    <button class="action-button cancel-btn">Cancelar</button>
                    <button class="action-button save-btn">Salvar Alterações</button>
                </div>
            </div>
        `;
        
        container.querySelector('.add-row-btn').addEventListener('click', () => {
            const newRowHtml = createNewScheduleRowHtml();
            container.querySelector('.edit-table tbody').insertAdjacentHTML('beforeend', newRowHtml);
        });
        container.querySelector('.edit-table tbody').addEventListener('click', (e) => { 
            if (e.target.classList.contains('delete-row-btn')) e.target.closest('tr').remove(); 
        });
        container.querySelector('.cancel-btn').addEventListener('click', () => renderUserView(profData));
        container.querySelector('.save-btn').addEventListener('click', () => saveAvailability(user.uid));
    }

    async function saveAvailability(uid) {
        const saveButton = container.querySelector('.save-btn');
        saveButton.disabled = true;
        saveButton.textContent = 'Salvando...';

        const updatedHorarios = [];
        container.querySelectorAll('.edit-table tbody tr').forEach(row => {
            const dia = row.querySelector('.dia').value;
            const horario = row.querySelector('.horario').value;
            if (dia && horario) {
                updatedHorarios.push({
                    dia: dia,
                    horario: parseInt(horario),
                    modalidade: row.querySelector('.modalidade').value,
                    status: row.querySelector('.status').value
                });
            }
        });
        const updatedDemands = container.querySelector('.demands').value;
        
        try {
            await db.collection('usuarios').doc(uid).update({
                horarios: updatedHorarios,
                demandasNaoAtendidas: updatedDemands
            });
            window.showToast('Disponibilidade salva com sucesso!', 'success');
            fetchData();
        } catch(error) {
            console.error("Erro ao salvar disponibilidade:", error);
            window.showToast('Erro ao salvar disponibilidade.', 'error');
            saveButton.disabled = false;
            saveButton.textContent = 'Salvar Alterações';
        }
    }

    fetchData();
}