document.addEventListener("DOMContentLoaded", function () {
  const contentArea = document.getElementById("content-area");
  const menuItems = document.querySelectorAll(".menu-item");
  const userNameDisplay = document.getElementById("user-name");

  // Função para carregar dinamicamente as páginas internas do módulo
  function loadPage(pageName) {
    // Exibe um feedback de carregamento para o usuário
    contentArea.innerHTML =
      '<div class="loading-feedback"><h1>Carregando...</h1></div>';

    fetch(`${pageName}.html`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(
            `A página '${pageName}.html' não foi encontrada. Verifique o nome do arquivo.`
          );
        }
        return response.text();
      })
      .then((html) => {
        contentArea.innerHTML = html;

        // É crucial re-executar os scripts da página que foi carregada.
        // Esta abordagem encontra todos os scripts no HTML injetado e cria novos
        // elementos de script para que o navegador os execute.
        Array.from(contentArea.querySelectorAll("script")).forEach(
          (oldScript) => {
            const newScript = document.createElement("script");
            // Copia todos os atributos (como src, type, etc.)
            Array.from(oldScript.attributes).forEach((attr) => {
              newScript.setAttribute(attr.name, attr.value);
            });
            // Copia o conteúdo de scripts inline
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            // Substitui o script antigo pelo novo para acionar a execução
            oldScript.parentNode.replaceChild(newScript, oldScript);
          }
        );
      })
      .catch((error) => {
        console.error("Erro ao carregar a página:", error);
        contentArea.innerHTML = `<div class="error-feedback"><h1>Erro ao Carregar</h1><p>${error.message}</p></div>`;
      });
  }

  // Monitora o estado de autenticação do usuário
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Se o usuário está logado, busca seu nome no Realtime Database
      database
        .ref("users/" + user.uid)
        .once("value")
        .then((snapshot) => {
          const userData = snapshot.val();
          // Exibe o nome do usuário ou o email como fallback
          userNameDisplay.textContent =
            userData && userData.nome ? userData.nome : user.email;
        });
      // Carrega a página inicial padrão do módulo (dashboard)
      loadPage("dashboard-reunioes");
    } else {
      // Se não houver usuário, redireciona para a página de login
      window.location.href = "../../../index.html";
    }
  });

  // Adiciona o evento de clique para cada item do menu
  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault(); // Impede o comportamento padrão do link

      // Remove a classe 'active' de todos os itens
      menuItems.forEach((i) => i.classList.remove("active"));
      // Adiciona a classe 'active' apenas ao item que foi clicado
      this.classList.add("active");

      const pageName = this.getAttribute("data-page");
      loadPage(pageName);
    });
  });
});
