document.addEventListener("DOMContentLoaded", function () {
  const contentArea = document.getElementById("content-area");
  const menuItems = document.querySelectorAll(".menu-item");
  const userNameDisplay = document.getElementById("user-name");
  const logoutButton = document.getElementById("logout-button");

  // Função para carregar dinamicamente o conteúdo das páginas
  function loadPage(pageName) {
    contentArea.innerHTML = "<h1>Carregando...</h1>"; // Feedback visual
    fetch(`${pageName}.html`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`Página ${pageName}.html não encontrada.`);
        return response.text();
      })
      .then((html) => {
        contentArea.innerHTML = html;
        // Re-executa os scripts da página carregada
        Array.from(contentArea.querySelectorAll("script")).forEach(
          (oldScript) => {
            const newScript = document.createElement("script");
            Array.from(oldScript.attributes).forEach((attr) =>
              newScript.setAttribute(attr.name, attr.value)
            );
            newScript.appendChild(document.createTextNode(oldScript.innerHTML));
            oldScript.parentNode.replaceChild(newScript, oldScript);
          }
        );
      })
      .catch((error) => {
        console.error("Erro ao carregar página:", error);
        contentArea.innerHTML = `<h1 style="color:red;">Erro: ${error.message}</h1>`;
      });
  }

  // Verifica o estado da autenticação
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      database
        .ref("users/" + user.uid)
        .once("value")
        .then((snapshot) => {
          const userData = snapshot.val();
          if (userData && userData.nome) {
            userNameDisplay.textContent = userData.nome;
          } else {
            userNameDisplay.textContent = user.email; // Fallback para o email
          }
        });
      // Carrega a página inicial por padrão
      loadPage("dashboard-reunioes");
    } else {
      // Se não houver usuário logado, redireciona para a página de login
      window.location.href = "../../../index.html";
    }
  });

  // Adiciona os listeners de evento para os itens do menu
  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      menuItems.forEach((i) => i.classList.remove("active"));
      this.classList.add("active");
      const page = this.getAttribute("data-page");
      loadPage(page);
    });
  });

  // Funcionalidade do botão de logout
  logoutButton.addEventListener("click", () => {
    firebase
      .auth()
      .signOut()
      .then(() => {
        window.location.href = "../../../index.html";
      })
      .catch((error) => {
        console.error("Erro ao fazer logout:", error);
      });
  });
});
