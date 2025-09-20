// Arquivo: /modulos/voluntario/js/view-meus-supervisionados.js (Corrigido)
// Versão: 3.0
// Descrição: Carrega e exibe as FICHAS de acompanhamento dos profissionais supervisionados pelo usuário logado.

import { db, collection, query, where, getDocs, doc, getDoc } from '../../../assets/js/firebase-init.js';

export function init(db, user, userData) {
    const container = document.getElementById('minhas-fichas');
    if (!container) return;

    const listaContainer = container.querySelector('#lista-supervisionados-container');
    const filtroProfissional = container.querySelector('#filtro-profissional');
    const filtroPaciente = container.querySelector('#filtro-paciente');
    
    let todasAsFichas = []; // Armazena as fichas para filtrar no cliente

    async function carregarFichas() {
        if (!user) {
            listaContainer.innerHTML = '<p class="info-card">Você precisa estar logado para ver esta página.</p>';
            return;
        }

        listaContainer.innerHTML = '<div class="loading-spinner"></div>';

        try {
            const supervisaoRef = collection(db, 'supervisao');
            const q = query(supervisaoRef, where('supervisorUid', '==', user.uid));
            const querySnapshot = await getDocs(q);

            if (querySnapshot.empty) {
                listaContainer.innerHTML = '<p class="info-card">Nenhuma ficha de supervisão encontrada para você.</p>';
                return;
            }

            const fichasPromises = querySnapshot.docs.map(async (docSnapshot) => {
                const ficha = docSnapshot.data();
                ficha.id = docSnapshot.id;
                
                // Buscar nome do profissional para exibição
                const profissionalDocRef = doc(db, 'usuarios', ficha.profissionalUid);
                const profissionalSnap = await getDoc(profissionalDocRef);
                ficha.profissionalNome = profissionalSnap.exists() ? profissionalSnap.data().nome : 'Desconhecido';

                return ficha;
            });

            todasAsFichas = await Promise.all(fichasPromises);
            renderFichas(todasAsFichas);
            popularFiltros();

        } catch (error) {
            console.error("Erro ao carregar fichas de supervisão:", error);
            listaContainer.innerHTML = `<div class="info-card" style="border-left-color: var(--cor-erro);">Ocorreu um erro ao carregar as fichas.</div>`;
        }
    }
    
    function renderFichas(fichas) {
        listaContainer.innerHTML = '';
        if (fichas.length === 0) {
            listaContainer.innerHTML = '<p class="info-card">Nenhum resultado encontrado para os filtros selecionados.</p>';
            return;
        }

        const table = document.createElement('table');
        table.className = 'table-modern'; // Uma classe para estilizar a tabela
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Data</th>
                    <th>Profissional</th>
                    <th>Paciente (Iniciais)</th>
                    <th>Ações</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;
        const tbody = table.querySelector('tbody');
        fichas.forEach(ficha => {
            const dataFormatada = ficha.data ? new Date(ficha.data).toLocaleDateString('pt-BR') : 'N/A';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${dataFormatada}</td>
                <td>${ficha.profissionalNome}</td>
                <td>${ficha.iniciaisPaciente || 'N/A'}</td>
                <td><a href="#ficha-supervisao/${ficha.id}" class="btn btn-primary">Ver Ficha</a></td>
            `;
            tbody.appendChild(tr);
        });
        listaContainer.appendChild(table);
    }

    function popularFiltros() {
        const profissionais = [...new Set(todasAsFichas.map(f => f.profissionalNome))];
        const pacientes = [...new Set(todasAsFichas.map(f => f.iniciaisPaciente))];

        filtroProfissional.innerHTML = '<option value="">Todos os Profissionais</option>';
        profissionais.forEach(nome => {
            filtroProfissional.innerHTML += `<option value="${nome}">${nome}</option>`;
        });

        filtroPaciente.innerHTML = '<option value="">Todos os Pacientes</option>';
        pacientes.forEach(iniciais => {
            filtroPaciente.innerHTML += `<option value="${iniciais}">${iniciais}</option>`;
        });
    }

    function aplicarFiltros() {
        const profSelecionado = filtroProfissional.value;
        const pacSelecionado = filtroPaciente.value;

        let fichasFiltradas = todasAsFichas;

        if (profSelecionado) {
            fichasFiltradas = fichasFiltradas.filter(f => f.profissionalNome === profSelecionado);
        }
        if (pacSelecionado) {
            fichasFiltradas = fichasFiltradas.filter(f => f.iniciaisPaciente === pacSelecionado);
        }

        renderFichas(fichasFiltradas);
    }

    filtroProfissional.addEventListener('change', aplicarFiltros);
    filtroPaciente.addEventListener('change', aplicarFiltros);

    carregarFichas();
}