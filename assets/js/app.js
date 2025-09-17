// Arquivo: assets/js/app.js
// Versão: 2.2 (DIAGNÓSTICO)
// Descrição: Versão de teste para diagnosticar o problema de carregamento de módulos.

import { auth, db } from './firebase-init.js';

document.addEventListener('DOMContentLoaded', function() {
    
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('[TESTE] Usuário autenticado. Tentando renderizar o layout.');
            const userDoc = await db.collection("usuarios").doc(user.uid).get();
            if (userDoc.exists) {
                console.log('[TESTE] Dados do usuário encontrados.');
                await renderLayoutAndContent(user, userDoc.data());
            } else {
                console.log('[TESTE] ERRO: Documento do usuário não encontrado no Firestore.');
            }
        } else {
            console.log('[TESTE] Usuário não autenticado.');
            // A lógica de login será ignorada neste teste para focar no erro principal.
            const loginView = document.getElementById('login-view');
            if(loginView) loginView.innerHTML = '<h2>Por favor, faça login para continuar.</h2>';
        }
    });

});

async function renderLayoutAndContent(user, userData) {
    console.log('[TESTE] Iniciando renderLayoutAndContent.');
    const path = window.location.pathname;
    console.log('[TESTE] Path detectado:', path);

    try {
        if (path.includes('administrativo-painel.html')) {
            console.log('[TESTE] Tentando carregar o módulo ADMINISTRATIVO...');
            const adminModule = await import('../modulos/administrativo/js/administrativo-painel.js');
            console.log('[TESTE] Módulo ADMINISTRATIVO importado com sucesso.');
            adminModule.init(user, db, userData);
            console.log('[TESTE] Módulo ADMINISTRATIVO inicializado.');

        } else if (path.includes('painel-financeiro.html')) {
            console.log('[TESTE] Tentando carregar o módulo FINANCEIRO...');
            const financeModule = await import('../modulos/financeiro/js/painel-financeiro.js');
            console.log('[TESTE] Módulo FINANCEIRO importado com sucesso.');
            financeModule.initFinancePanel(user, db, userData);
            console.log('[TESTE] Módulo FINANCEIRO inicializado.');

        } else if (path.includes('portal-voluntario.html')) {
            console.log('[TESTE] Tentando carregar o módulo VOLUNTÁRIO...');
             const volunteerModule = await import('../modulos/voluntario/js/portal-voluntario.js');
             console.log('[TESTE] Módulo VOLUNTÁRIO importado com sucesso.');
             volunteerModule.init(user, db, userData);
             console.log('[TESTE] Módulo VOLUNTÁRIO inicializado.');

        } else {
            console.log('[TESTE] Nenhum módulo corresponde ao path. Assumindo index.html.');
            // Lógica da index.html
            const dashboardView = document.getElementById('dashboard-view');
            if(dashboardView) dashboardView.style.display = 'block';
        }
    } catch (error) {
        console.error('[TESTE] ERRO CRÍTICO DURANTE O CARREGAMENTO DO MÓDULO:', error);
    }
}