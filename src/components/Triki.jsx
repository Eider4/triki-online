import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FaTimes, FaRegCircle } from "react-icons/fa";

const WS_URL = "wss://pnji6wsbyh.execute-api.us-east-2.amazonaws.com/dev";

const WINNING_COMBINATIONS = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

const LINE_STYLES = {
  "0,1,2": {
    marginTop: "-15.6rem",
    marginLeft: "0.5rem",
    width: "330%",
    rotate: "0deg",
  }, //horizontal
  "3,4,5": {
    marginTop: "-9.6rem",
    marginLeft: "0.5rem",
    width: "330%",
    rotate: "0deg",
  }, //horizontal
  "6,7,8": {
    marginTop: "-3.6rem",
    marginLeft: "0.5rem",
    width: "330%",
    rotate: "0deg",
  }, //horizontal
  "0,3,6": {
    width: "350%",
    rotate: "90deg",
    marginTop: "-18rem",
    marginLeft: "2.5rem",
  }, //vertical
  "1,4,7": {
    width: "350%",
    rotate: "90deg",
    marginTop: "-18rem",
    marginLeft: "8.18rem",
  }, //vertical
  "2,5,8": {
    width: "350%",
    rotate: "90deg",
    marginTop: "-18rem",
    marginLeft: "13.85rem",
  }, //vertical
  "0,4,8": {
    top: "1%",
    left: "2.6%",
    width: "140%",
    rotate: "46.2deg",
    position: "absolute",
  }, //diagonal
  "2,4,6": {
    top: "102%",
    left: "2.3%",
    width: "140%",
    rotate: "314deg",
    position: "absolute",
  }, //diagonal
};

export default function Triki() {
  const [ws, setWs] = useState(null);
  const name = JSON.parse(localStorage.getItem("trikiName")) || null;
  const [playerName, setPlayerName] = useState(name ? name.name : null);
  const [player, setPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));

  const [inputCode, setInputCode] = useState("");
  const [message, setMessage] = useState("");

  const [playerCount, setPlayerCount] = useState(0);

  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);

  const [history, setHistory] = useState([]);
  const [nameInput, setNameInput] = useState("");
  // ==========================
  // Conexión WebSocket
  // ==========================
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    setWs(socket);

    socket.onerror = (err) => setMessage("⚠️ Conexión perdida...");

    socket.onmessage = (msg) => {
      if (!msg.data) return;
      const data = JSON.parse(msg.data);
      switch (data.action) {
        case "gameCreated":
          setGameId(data.gameId);
          setPlayer(playerName);
          setMessage(
            `🚀 Sala creada. Código: ${data.gameId}. Comienza: ${data.starter}`
          );
          requestHistory(data.gameId);
          const user = {
            name: nameInput,
            symbol: "X",
          };
          localStorage.setItem("trikiName", JSON.stringify(user));

          break;

        case "joinedGame":
          setGameId(data.gameId);
          setPlayer(playerName);
          setMessage(`✨ Te uniste al juego ${data.gameId}`);
          requestHistory(data.gameId);
          break;

        case "playerJoined":
          setMessage(`👾 ${data.player} se unió a la partida`);
          break;

        case "playerLeft":
          setMessage(`💀 ${data.player} se desconectó`);
          setPlayerCount((prev) => Math.max(0, prev - 1));
          break;

        case "playerCount":
          setPlayerCount(data.count);
          break;
        case "updateBoard":
          setBoard(data.board);
          checkWinner(data.board);
          // Actualizar historial después de jugar
          requestHistory(gameId);
          break;

        case "resetBoard":
          setBoard(data.board);
          setWinner(null);
          setWinningLine(null);
          console.log(data);
          setMessage(`♻️ Juego reiniciado. Comienza ${data.turn}`);
          break;

        case "history":
          setHistory(data.history || []);
          break;

        default:
          if (data.error) setMessage(`⚠️ Error: ${data.error}`);
          break;
      }
    };

    return () => socket.close();
  }, [playerName]);

  // ==========================
  // Guardar nombre
  // ==========================
  const handleSetName = () => {
    if (!nameInput.trim()) return setMessage("⚠️ Ingresa un nombre válido");
    const user = {
      name: nameInput,
      symbol: "",
    };
    localStorage.setItem("trikiName", JSON.stringify(user));
    setPlayerName(nameInput);

    setMessage(`✅ Nombre guardado: ${nameInput}`);
  };

  // Mensajes temporales
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 4000);
    return () => clearTimeout(timer);
  }, [message]);

  // ==========================
  // WS Helpers
  // ==========================
  const sendMessage = (msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  };

  const requestHistory = (gameId) => {
    sendMessage({ action: "getHistory", gameId });
  };

  // ==========================
  // Crear / Unirse / Jugar
  // ==========================
  const createGame = () => {
    if (!playerName) return setMessage("⚠️ Ingresa un nombre primero");
    sendMessage({ action: "createGame", name: playerName });
  };

  const joinGame = () => {
    if (!playerName) return setMessage("⚠️ Ingresa un nombre primero");
    if (!inputCode.trim()) return setMessage("⚠️ Ingresa un código de sala");
    if (playerCount >= 2)
      return setMessage("⚠️ La partida ya tiene 2 jugadores");
    sendMessage({ action: "joinGame", gameId: inputCode, name: playerName });
  };

  const canPlay = () => playerCount === 2 && !winner && player;

  const handlePlay = (index) => {
    if (!canPlay()) return;
    if (board[index] !== null) return setMessage("⚠️ Celda ocupada");

    sendMessage({
      action: "play",
      gameId,
      cell: index,
      name: playerName,
    });
  };

  const resetGame = () => {
    if (gameId) sendMessage({ action: "reset", gameId });
  };

  // ==========================
  // Historial / Ganador
  // ==========================
  const checkWinner = (board) => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a]);
        setWinningLine(combo);
        setMessage(`🎇 ${board[a]} gana!`);
        return;
      }
    }
    if (board.every((cell) => cell !== null)) {
      setWinner("draw");
      setMessage("🤝 Empate galáctico!");
    }
  };
  // ==========================
  const getGroupedHistory = () => {
    const wins = {};
    history.forEach((h) => {
      if (h.winner && h.winner !== "draw") {
        wins[h.winner] = (wins[h.winner] || 0) + 1;
      }
    });
    return wins;
  };
  // ==========================
  // Render
  // ==========================

  return (
    <div className="p-6 max-w-md mx-auto text-center bg-black rounded-lg shadow-lg border-2 border-purple-500">
      <h1 className="text-4xl font-bold mb-4 text-cyan-400 neon-text">
        🕹️ Triki Retro-Futurista
      </h1>

      {!playerName && (
        <div className="mb-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Ingresa tu nombre"
            className="border border-cyan-400 p-2 rounded bg-black text-white placeholder:text-gray-500"
          />
          <button
            onClick={handleSetName}
            className="ml-2 px-4 py-2 bg-cyan-600 text-white rounded neon-glow"
          >
            Guardar
          </button>
        </div>
      )}

      <AnimatePresence>
        {message && (
          <motion.div
            key={message}
            initial={{ y: -30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -30, opacity: 0 }}
            className="text-white bg-purple-700 px-4 py-2 rounded-lg mb-4 neon-glow text-lg"
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>

      {!gameId && playerName && (
        <div className="space-y-4">
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={createGame}
            className="px-6 py-3 bg-cyan-600 text-white rounded neon-glow"
          >
            Crear partida
          </motion.button>

          <div className="flex items-center justify-center space-x-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Código de sala"
              className="border border-cyan-400 p-2 rounded bg-black text-white placeholder:text-gray-500"
            />
            <motion.button
              whileHover={{ scale: 1.1 }}
              onClick={joinGame}
              className="px-6 py-3 bg-pink-600 text-white rounded neon-glow"
            >
              Unirse
            </motion.button>
          </div>
        </div>
      )}

      {gameId && (
        <div className="mt-6">
          <p className="mb-2 text-cyan-300">
            Sala: <strong>{gameId}</strong>
          </p>
          <p className="mb-2 text-pink-400">
            Jugador: <strong>{player}</strong>
          </p>
          <p className="mb-2 text-purple-400">
            Jugadores conectados: <strong>{playerCount}/2</strong>
          </p>
          <div className="relative grid grid-cols-3 gap-4 w-64 h-64 mx-auto mb-4">
            {board.map((cell, idx) => (
              <motion.div
                key={idx}
                onClick={() => canPlay() && handlePlay(idx)}
                whileHover={{ scale: canPlay() ? 1.1 : 1 }}
                whileTap={{ scale: canPlay() ? 0.9 : 1 }}
                className={`flex items-center justify-center border-2 rounded-lg text-4xl font-bold cursor-pointer h-20 w-20  ${
                  !canPlay() ? "opacity-50 cursor-not-allowed" : "neon-glow"
                } ${
                  cell === "X"
                    ? "text-cyan-400"
                    : cell === "O"
                    ? "text-pink-400"
                    : "text-gray-700"
                }`}
              >
                {cell === "X" ? "X" : cell === "O" ? "O" : ""}
              </motion.div>
            ))}
            {winningLine && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6 }}
                className=" bg-purple-400 h-2 origin-left neon-glow z-20 rounded-full"
                style={{ ...LINE_STYLES[winningLine.join(",")] }}
              />
            )}
          </div>
          {gameId && playerName && (
            <div className="mb-4">
              <p className="text-cyan-300">
                Símbolo:{" "}
                {player &&
                JSON.parse(localStorage.getItem("trikiName"))?.symbol ===
                  "X" ? (
                  <FaTimes className="inline text-cyan-400" />
                ) : (
                  <FaRegCircle className="inline text-pink-400" />
                )}
              </p>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={resetGame}
            disabled={!winner && board.every((cell) => cell === null)}
            className="px-6 py-3 mt-4 bg-purple-600 text-white rounded neon-glow"
          >
            Reiniciar
          </motion.button>
          <div className="mt-6 text-left text-gray-300">
            <h2 className="text-lg font-bold mb-2">
              🏆 Historial de victorias
            </h2>
            {history.length === 0 && <p>No hay partidas aún</p>}
            {Object.entries(getGroupedHistory()).map(([name, wins]) => (
              <p key={name}>
                {name}: {wins} victorias
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
