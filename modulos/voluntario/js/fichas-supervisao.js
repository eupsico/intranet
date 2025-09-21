// Arquivo: /modulos/voluntario/js/fichas-supervisao.js (CORRIGIDO)
// Versão: 3.1 (Corrige consulta de acordo com as novas regras do Firebase)
// Descrição: Lista as fichas de supervisão do psicólogo com filtro.

import { db, collection, getDocs, query, where, orderBy } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const container = document.getElementById('acompanhamentos');
    if (!container) return;

    let todasAsFichas = []; // Cache para filtrar no cliente

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
            tableHtml += '<tr><td colspan="4">Nenhuma ficha encontrada.</td></tr>';
        } else {
            // Ordena as fichas pela data mais recente primeiro
            fichas.sort((a, b) => new Date(b.data) - new Date(a.data));
            
            fichas.forEach(ficha => {
                const dataFormatada = ficha.data ? new Date(ficha.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'N/A';
                tableHtml += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${ficha.iniciaisPaciente || 'N/A'}</td>
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
            ficha.iniciaisPaciente && ficha.iniciaisPaciente.toLowerCase().includes(termo)
        );
        document.getElementById('lista-fichas-container').innerHTML = renderFichas(fichasFiltradas);
    };

    async function carregarRegistros() {
        container.innerHTML = `
            <div class="dashboard-section">
                <div class="form-group">
                    <label for="filtro-paciente">Filtrar por Iniciais do Paciente:</label>
                    <input type="text" id="filtro-paciente" class="form-control" placeholder="Digite as iniciais para buscar...">
                </div>
                <div class="form-actions" style="text-align: right;">
                    <a href="#ficha-supervisao/new" class="btn btn-primary">Preencher Nova Ficha</a>
                </div>
            </div>
            <div id="lista-fichas-container" class="dashboard-section">
                <div class="loading-spinner"></div>
            </div>
        `;
        
        document.getElementById('filtro-paciente').addEventListener('input', aplicarFiltro);

        try {
            const supervisaoRef = collection(db, 'supervisao');
            
            // CORREÇÃO: A regra "list" foi removida. A nova regra "read" permite a consulta se
            // a cláusula 'where' corresponder ao UID do usuário.
            const q = query(supervisaoRef, where('profissionalUid', '==', user.uid));
            const querySnapshot = await getDocs(q);

            todasAsFichas = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            document.getElementById('lista-fichas-container').innerHTML = renderFichas(todasAsFichas);

        } catch (error) {
            console.error("Erro ao carregar registros:", error);
            document.getElementById('lista-fichas-container').innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar seus acompanhamentos. Verifique o console para mais detalhes.</div>`;
        }
    }

    carregarRegistros();
}