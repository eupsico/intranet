document.addEventListener("DOMContentLoaded", function () {
  const contentArea = document.getElementById("content-area");
  const menuItems = document.querySelectorAll(".menu-item");
  const userNameDisplay = document.getElementById("user-name");
  const logoutButton = document.getElementById("logout-button");

  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Busca o nome do usuário no Realtime Database
      database
        .ref("users/" + user.uid)
        .once("value")
        .then((snapshot) => {
          const userProfile = snapshot.val();
          if (userProfile && userProfile.nome) {
            userNameDisplay.textContent = userProfile.nome;
          } else {
            userNameDisplay.textContent = user.email;
          }
        });

      // Carrega a página inicial (dashboard)
      loadPage("dashboard-reunioes");
    } else {
      // Se não estiver logado, redireciona para a página de login
      window.location.href = "../../../index.html";
    }
  });

  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();

      // Remove a classe 'active' de todos os itens
      menuItems.forEach((i) => i.classList.remove("active"));
      // Adiciona a classe 'active' ao item clicado
      this.classList.add("active");

      const page = this.getAttribute("data-page");
      loadPage(page);
    });
  });

  function loadPage(page) {
    // Mostra um feedback de carregamento
    contentArea.innerHTML = "<h1>Carregando...</h1>";
    fetch(`${page}.html`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`A página ${page}.html não foi encontrada.`);
        }
        return response.text();
      })
      .then((html) => {
        contentArea.innerHTML = html;
        // Ativa os scripts da página carregada
        const scripts = contentArea.querySelectorAll("script");
        scripts.forEach((script) => {
          const newScript = document.createElement("script");
          // Copia atributos e conteúdo
          if (script.src) {
            newScript.src = script.src;
          } else {
            newScript.textContent = script.textContent;
          }
          document.body
            .appendChild(newScript)
            .parentNode.removeChild(newScript);
        });
      })
      .catch((error) => {
        console.error("Erro ao carregar a página:", error);
        contentArea.innerHTML = `<h1 style="color: red;">Erro ao carregar a página. Verifique o console.</h1>`;
      });
  }

  logoutButton.addEventListener("click", () => {
    firebase
      .auth()
      .signOut()
      .then(() => {
        window.location.href = "../../../index.html";
      });
  });
});
