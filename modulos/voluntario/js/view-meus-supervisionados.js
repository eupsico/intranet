// Arquivo: /modulos/voluntario/js/view-meus-supervisionados.js (CORRIGIDO)
// Versão: 3.4 (Usa o campo correto 'pacienteIniciais', validações e navegação corrigida)
// Descrição: Carrega e exibe as FICHAS dos profissionais supervisionados.

import { db, collection, query, where, getDocs, doc, getDoc } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const container = document.getElementById('meus-supervisionados');
    if (!container) return;
    
    let todasAsFichas = [];

    const renderFichas = (fichas) => {
        const listaContainer = document.getElementById('lista-supervisionados-container');
        if (!listaContainer) return;
        
        let tableHtml = `
            <table class="table-modern">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Profissional</th>
                        <th>Paciente (Iniciais)</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody>
        `;
        if (fichas.length === 0) {
            tableHtml += '<tr><td colspan="4">Nenhuma ficha encontrada.</td></tr>';
        } else {
            fichas.sort((a, b) => new Date(b.data) - new Date(a.data));
            fichas.forEach(ficha => {
                const dataFormatada = ficha.data ? new Date(ficha.data).toLocaleDateString('pt-BR', {timeZone: 'UTC'}) : 'N/A';
                // CORREÇÃO: Usando o nome de campo correto do Firestore
                tableHtml += `
                    <tr>
                        <td>${dataFormatada}</td>
                        <td>${ficha.profissionalNome || 'Não informado'}</td>
                        <td>${ficha.pacienteIniciais || 'N/A'}</td>
                        <td><a href="#" onclick="window.viewNavigator.push('ficha-supervisao/${ficha.id}')" class="btn btn-primary">Ver Ficha</a></td>
                    </tr>
                `;
            });
        }
        tableHtml += '</tbody></table>';
        listaContainer.innerHTML = tableHtml;
    };

    const aplicarFiltros = () => {
        const profSelecionado = document.getElementById('filtro-profissional').value;
        const pacSelecionado = document.getElementById('filtro-paciente').value;
        let fichasFiltradas = todasAsFichas;

        if (profSelecionado) {
            fichasFiltradas = fichasFiltradas.filter(f => f.profissionalNome === profSelecionado);
        }
        if (pacSelecionado) {
            fichasFiltradas = fichasFiltradas.filter(f => f.pacienteIniciais && f.pacienteIniciais === pacSelecionado);
        }
        renderFichas(fichasFiltradas);
    };
    
    const popularFiltros = () => {
        const filtroProfissional = document.getElementById('filtro-profissional');
        const filtroPaciente = document.getElementById('filtro-paciente');
        const profissionais = [...new Set(todasAsFichas.map(f => f.profissionalNome).filter(Boolean))];
        const pacientes = [...new Set(todasAsFichas.map(f => f.pacienteIniciais).filter(Boolean))];
        
        filtroProfissional.innerHTML = '<option value="">Todos os Profissionais</option>' + profissionais.map(n => `<option value="${n}">${n}</option>`).join('');
        filtroPaciente.innerHTML = '<option value="">Todos os Pacientes</option>' + pacientes.map(i => `<option value="${i}">${i}</option>`).join('');
        
        filtroProfissional.addEventListener('change', aplicarFiltros);
        filtroPaciente.addEventListener('change', aplicarFiltros);
    };

    async function carregarFichas() {
        container.innerHTML = `
            <div class="dashboard-section">
                <div class="form-row">
                    <div class="form-group">
                        <label for="filtro-profissional">Filtrar por Profissional:</label>
                        <select id="filtro-profissional" class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label for="filtro-paciente">Filtrar por Paciente:</label>
                        <select id="filtro-paciente" class="form-control"></select>
                    </div>
                </div>
            </div>
            <div id="lista-supervisionados-container" class="dashboard-section">
                <div class="loading-spinner"></div>
            </div>
        `;

        try {
            const supervisaoRef = collection(db, 'supervisao');
            const q = query(supervisaoRef, where('supervisorUid', '==', user.uid));
            const querySnapshot = await getDocs(q);
            
            const fichasPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const ficha = docSnapshot.data();
                ficha.id = docSnapshot.id;
                
                if (!ficha.profissionalNome && ficha.profissionalUid) {
                    const profissionalSnap = await getDoc(doc(db, 'usuarios', ficha.profissionalUid));
                    ficha.profissionalNome = profissionalSnap.exists() ? profissionalSnap.data().nome : 'Desconhecido';
                }
                return ficha;
            });

            todasAsFichas = await Promise.all(fichasPromises);
            renderFichas(todasAsFichas);
            popularFiltros();

        } catch (error) {
            console.error("Erro ao carregar fichas:", error);
            document.getElementById('lista-supervisionados-container').innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar as fichas. Verifique o console.</div>`;
        }
    }
    
    carregarFichas();
}