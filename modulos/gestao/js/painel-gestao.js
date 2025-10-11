document.addEventListener("DOMContentLoaded", function () {
  // --- Elementos do DOM ---
  const contentArea = document.getElementById("content-area");
  const menuItems = document.querySelectorAll(".menu-item");
  const menuToggleButton = document.getElementById("menu-toggle");
  const greetingDisplay = document.getElementById("greeting");
  const userPhotoDisplay = document.getElementById("user-photo");

  // --- Funções ---

  /**
   * Carrega dinamicamente o conteúdo de uma página HTML na área principal.
   * @param {string} pageName O nome do arquivo HTML (sem a extensão).
   */
  function loadPage(pageName) {
    contentArea.innerHTML = "<h1>Carregando...</h1>";
    fetch(`${pageName}.html`)
      .then((response) => {
        if (!response.ok)
          throw new Error(`A página '${pageName}.html' não foi encontrada.`);
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
        console.error("Erro ao carregar a página:", error);
        contentArea.innerHTML = `<h1 style="color:red;">Erro ao carregar: ${error.message}</h1>`;
      });
  }

  /**
   * Define a saudação (Bom dia, Boa tarde, Boa noite) com base na hora atual.
   * @param {string} userName O primeiro nome do usuário.
   */
  function setGreeting(userName) {
    const hour = new Date().getHours();
    let greetingText = "Olá";
    if (hour >= 5 && hour < 12) {
      greetingText = "Bom dia";
    } else if (hour >= 12 && hour < 18) {
      greetingText = "Boa tarde";
    } else {
      greetingText = "Boa noite";
    }
    greetingDisplay.textContent = `${greetingText}, ${userName}!`;
  }

  // --- Lógica de Inicialização ---

  // Monitora o estado de autenticação do usuário
  firebase.auth().onAuthStateChanged((user) => {
    if (user) {
      // Se logado, busca os dados do usuário no Realtime Database
      database
        .ref("users/" + user.uid)
        .once("value")
        .then((snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            const firstName = userData.nome
              ? userData.nome.split(" ")[0]
              : "Usuário";
            setGreeting(firstName);

            // Atualiza a foto do usuário, se existir
            if (userData.photoURL) {
              userPhotoDisplay.src = userData.photoURL;
            }
          } else {
            setGreeting("Usuário"); // Fallback
          }
        });
      // Carrega a página inicial padrão
      loadPage("dashboard-reunioes");
    } else {
      // Se não estiver logado, redireciona para a página de login
      window.location.href = "../../../index.html";
    }
  });

  // --- Event Listeners ---

  // Adiciona o evento de clique para cada item do menu
  menuItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      menuItems.forEach((i) => i.classList.remove("active"));
      this.classList.add("active");
      const pageName = this.getAttribute("data-page");
      loadPage(pageName);
    });
  });

  // Adiciona o evento de clique para o botão "hambúrguer"
  menuToggleButton.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-collapsed");
  });
});
