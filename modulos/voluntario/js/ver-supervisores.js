// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: 2.0 (Revisado e padronizado)
// Descrição: Painel de entrada para supervisores, verificando permissões e exibindo módulos.

import { doc, getDoc } from '../../../assets/js/firebase-init.js';

export function init(db, user) {
    const dashboardContent = document.getElementById('supervisor-dashboard-content');
    const supervisorCardsGrid = document.getElementById('supervisor-cards-grid');

    if (!dashboardContent || !supervisorCardsGrid) {
        console.error("Erro crítico: Elementos do HTML do painel do supervisor não foram encontrados.");
        return;
    }

    /**
     * Renderiza os cards de navegação para as seções do supervisor.
     */
    function renderSupervisorCards() {
        supervisorCardsGrid.innerHTML = '';
        
        const modules = {
            'view-meu-perfil': { 
                titulo: 'Meu Perfil e Edição', 
                descricao: 'Visualize e edite suas informações de perfil.' 
            },
            'view-meus-supervisionados': { 
                titulo: 'Meus Supervisionados', 
                descricao: 'Visualize os acompanhamentos que você supervisiona.' 
            }
        };

        for (const key in modules) {
            const module = modules[key];
            const card = document.createElement('div');
            card.className = 'module-card';
            card.dataset.view = key; 
            card.innerHTML = `<div class="card-content"><h3>${module.titulo}</h3><p>${module.descricao}</p></div>`;
            
            card.addEventListener('click', () => {
                window.location.hash = `#${key}`;
            });
            
            supervisorCardsGrid.appendChild(card);
        }
    }

    /**
     * Verifica se o usuário logado tem permissão de supervisor ou admin.
     */
    async function checkPermissionsAndRender() {
        try {
            const userDocRef = doc(db, 'usuarios', user.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const funcoes = userDoc.data().funcoes || [];
                if (funcoes.includes('supervisor') || funcoes.includes('admin')) {
                    renderSupervisorCards();
                } else {
                    dashboardContent.innerHTML = '<h2>Acesso Negado</h2><p>Você não tem permissão para acessar esta área.</p>';
                }
            } else {
                 dashboardContent.innerHTML = '<h2>Usuário não encontrado.</h2>';
            }
        } catch (error) {
            console.error("Erro ao verificar permissões:", error);
            dashboardContent.innerHTML = '<h2>Ocorreu um erro ao verificar suas permissões.</h2>';
        }
    }

    checkPermissionsAndRender();
}