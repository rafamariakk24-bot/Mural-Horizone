// Importa os módulos do Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Configuração do seu projeto (pegue no console do Firebase)
const firebaseConfig = {
  apiKey: "SUA_API_KEY",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.appspot.com",
  messagingSenderId: "123456789",
  appId: "SEU_APP_ID"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Função para salvar dados no banco
window.salvarDado = async function() {
  const nome = document.getElementById("nome").value;
  if (!nome) return alert("Digite um nome!");

  try {
    await addDoc(collection(db, "usuarios"), {
      nome: nome,
      criadoEm: new Date()
    });
    alert("Salvo com sucesso!");
    document.getElementById("nome").value = "";
    listarDados();
  } catch (erro) {
    console.error("Erro ao salvar:", erro);
  }
};

// Função para listar dados salvos
async function listarDados() {
  const querySnapshot = await getDocs(collection(db, "usuarios"));
  const lista = document.getElementById("lista");
  lista.innerHTML = "";
  querySnapshot.forEach((doc) => {
    lista.innerHTML += `<p>${doc.data().nome}</p>`;
  });
}

listarDados();