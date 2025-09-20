// Arquivo: /modulos/voluntario/js/ver-supervisores.js
// Versão: MODERNA - Usando a sintaxe do Firebase v9

// Importa as funções 'doc' e 'getDoc' que foram exportadas pelo firebase-init.js
// O portal-voluntario.js já importa 'db' e 'user' e nos passa pela função init.
import { doc, getDoc } from '../../../assets/js/firebase-init.js';

export function init(db, user) {
    console.log("Módulo ver-supervisores.js inicializado (Firebase v9).");

    const dashboardContent = document.getElementById('supervisor-dashboard-content');
    const supervisorCardsGrid = document.getElementById('supervisor-cards-grid');

    if (!dashboardContent || !supervisorCardsGrid) {
        console.error("Erro crítico: Elementos do HTML do painel do supervisor não foram encontrados.");
        return;
    }

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

    // ===== CÓDIGO ATUALIZADO PARA FIREBASE v9 =====
    // Usamos async/await para um código mais limpo
    async function checkPermissionsAndRender() {
        try {
            // Cria a referência ao documento do usuário
            const userDocRef = doc(db, 'usuarios', user.uid);
            // Busca o documento
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

    // Chama a função para iniciar o processo
    checkPermissionsAndRender();
}