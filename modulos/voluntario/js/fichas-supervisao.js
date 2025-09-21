// Arquivo: /modulos/voluntario/js/fichas-supervisao.js
// Versão: 3.5 (Consulta e navegação validadas)
// Descrição: Lista as fichas de supervisão do psicólogo com filtro.

import { db, collection, getDocs, query, where, orderBy } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const container = document.getElementById('acompanhamentos');
    if (!container) return;

    let todasAsFichas = []; 

    const renderFichas = (fichas) => {
        let tableHtml = `
            <table class="table-modern">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Paciente (Iniciais)</th>
                        <th>Supervisor</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        if (fichas.length === 0) {
            tableHtml += '<tr><td colspan="4">Nenhuma ficha encontrada. Crie uma na aba "Ficha de Supervisão".</td></tr>';
        } else {
            // Ordena as fichas pela data da supervisão, da mais recente para a mais antiga
            fichas.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            fichas.forEach(ficha => {
                const dataFormatada = ficha.data ? new Date(ficha.data + 'T00:00:00').toLocaleDateString('pt-BR') : 'N/A';
                tableHtml += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${ficha.pacienteIniciais || 'N/A'}</td>
                        <td>${ficha.supervisorNome || 'N/A'}</td>
                        <td><a href="#ficha-supervisao/${ficha.id}" class="btn btn-primary">Ver/Editar</a></td>
                    </tr>
                `;
            });
        }
        tableHtml += '</tbody></table>';
        return tableHtml;
    };

    const aplicarFiltro = (e) => {
        const termo = e.target.value.toLowerCase();
        const fichasFiltradas = todasAsFichas.filter(ficha => 
            (ficha.pacienteIniciais && ficha.pacienteIniciais.toLowerCase().includes(termo)) ||
            (ficha.supervisorNome && ficha.supervisorNome.toLowerCase().includes(termo))
        );
        document.getElementById('lista-fichas-container').innerHTML = renderFichas(fichasFiltradas);
    };

    async function carregarRegistros() {
        container.innerHTML = `
            <div class="dashboard-section">
                <div class="form-group">
                    <label for="filtro-fichas">Filtrar por Paciente ou Supervisor:</label>
                    <input type="text" id="filtro-fichas" class="form-control" placeholder="Digite para buscar...">
                </div>
            </div>
            <div id="lista-fichas-container" class="dashboard-section">
                <div class="loading-spinner"></div>
            </div>
        `;
        
        document.getElementById('filtro-fichas').addEventListener('input', aplicarFiltro);

        try {
            const supervisaoRef = collection(db, 'supervisao');
            const q = query(supervisaoRef, where('psicologoUid', '==', user.uid));
            const querySnapshot = await getDocs(q);

            todasAsFichas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            document.getElementById('lista-fichas-container').innerHTML = renderFichas(todasAsFichas);

        } catch (error) {
            console.error("Erro ao carregar registros:", error);
            document.getElementById('lista-fichas-container').innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar seus acompanhamentos.</div>`;
        }
    }

    carregarRegistros();
}