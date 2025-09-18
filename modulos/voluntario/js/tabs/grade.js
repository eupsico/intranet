// Arquivo: /modulos/voluntario/js/tabs/grade.js
// Descrição: Módulo para a aba "Grade de Horários".

export function init(db, user, userData) {
    const container = document.querySelector('#grade-container');
    if (!container) return;

    const DIAS_SEMANA = {
        segunda: "Segunda",
        terca: "Terça",
        quarta: "Quarta",
        quinta: "Quinta",
        sexta: "Sexta",
        sabado: "Sábado"
    };
    const HORAS = Array.from({ length: 14 }, (_, i) => i + 8); // 8h às 21h

    async function fetchAndRenderGrade() {
        container.innerHTML = '<div class="loading-spinner"></div>';
        
        try {
            const snapshot = await db.collection('usuarios')
                .where('papeis', 'array-contains', 'terapeuta')
                .get();

            const gradeData = {};

            snapshot.forEach(doc => {
                const terapeuta = doc.data();
                if (terapeuta.horarios && terapeuta.horarios.length > 0) {
                    terapeuta.horarios.forEach(h => {
                        const key = `${h.dia}-${h.horario}`;
                        if (!gradeData[key]) {
                            gradeData[key] = [];
                        }
                        gradeData[key].push({
                            nome: terapeuta.nome.split(' ')[0], // Pega apenas o primeiro nome
                            status: h.status
                        });
                    });
                }
            });
            
            renderGradeTable(gradeData);

        } catch (error) {
            console.error("Erro ao buscar dados para a grade:", error);
            container.innerHTML = `<p class="alert alert-error">Não foi possível carregar a grade de horários.</p>`;
        }
    }

    function renderGradeTable(data) {
        let tableHtml = `
            <div class="grade-table-wrapper">
                <table class="grade-table">
                    <thead>
                        <tr>
                            <th>Horário</th>
                            ${Object.values(DIAS_SEMANA).map(dia => `<th>${dia}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${HORAS.map(hora => `
                            <tr>
                                <td class="hora-cell">${String(hora).padStart(2, '0')}:00</td>
                                ${Object.keys(DIAS_SEMANA).map(dia => {
                                    const key = `${dia}-${hora}`;
                                    const terapeutas = data[key];
                                    let cellContent = '';
                                    if (terapeutas) {
                                        cellContent = terapeutas.map(t => 
                                            `<div class="terapeuta-tag status-${t.status}">${t.nome}</div>`
                                        ).join('');
                                    }
                                    return `<td>${cellContent}</td>`;
                                }).join('')}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            <div class="grade-legenda">
                <span class="legenda-item"><div class="cor status-disponivel"></div> Disponível</span>
                <span class="legenda-item"><div class="cor status-ocupado"></div> Ocupado</span>
            </div>
        `;

        container.innerHTML = tableHtml;
    }

    fetchAndRenderGrade();
}