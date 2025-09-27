import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";

const WS_URL = "wss://pnji6wsbyh.execute-api.us-east-2.amazonaws.com/dev";

const WINNING_COMBINATIONS = [
  [0, 1, 2], // filas
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6], // columnas
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8], // diagonales
  [2, 4, 6],
];

// 📌 Mapeo para dibujar la línea ganadora
const LINE_STYLES = {
  "0,1,2": { top: "16.6%", left: "0", width: "100%", rotate: "0deg" },
  "3,4,5": { top: "50%", left: "0", width: "100%", rotate: "0deg" },
  "6,7,8": { top: "83.3%", left: "0", width: "100%", rotate: "0deg" },
  "0,3,6": { top: "0", left: "16.6%", height: "100%", rotate: "90deg" },
  "1,4,7": { top: "0", left: "50%", height: "100%", rotate: "90deg" },
  "2,5,8": { top: "0", left: "83.3%", height: "100%", rotate: "90deg" },
  "0,4,8": {
    top: "50%",
    left: "50%",
    width: "140%",
    rotate: "45deg",
    translate: "-50% -50%",
  },
  "2,4,6": {
    top: "50%",
    left: "50%",
    width: "140%",
    rotate: "-45deg",
    translate: "-50% -50%",
  },
};

export default function Triki() {
  const [ws, setWs] = useState(null);
  const [connected, setConnected] = useState(false);

  const [player, setPlayer] = useState(null);
  const [gameId, setGameId] = useState(null);
  const [board, setBoard] = useState(Array(9).fill(null));

  const [inputCode, setInputCode] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const [playerCount, setPlayerCount] = useState(1);
  const [turn, setTurn] = useState(null);

  const [winner, setWinner] = useState(null);
  const [winningLine, setWinningLine] = useState(null);

  // 📌 Conexión WebSocket
  useEffect(() => {
    const socket = new WebSocket(WS_URL);
    setWs(socket);

    socket.onopen = () => {
      setConnected(true);
      setLoading(false);
    };

    socket.onclose = () => {
      setConnected(false);
    };

    socket.onerror = (err) => {
      console.error("Error en WebSocket:", err);
      setMessage("⚠️ Error de conexión con el servidor");
    };

    socket.onmessage = (msg) => {
      try {
        if (!msg.data) return;
        const data = JSON.parse(msg.data);

        if (data.action === "gameCreated") {
          setGameId(data.gameId);
          setPlayer(data.player);
          setTurn("X");
          setMessage(`Sala creada. Código: ${data.gameId}`);
        }
        if (data.action === "joinedGame") {
          setGameId(data.gameId);
          setPlayer(data.player);
          setMessage(`Unido al juego ${data.gameId} como ${data.player}`);
        }
        if (data.action === "playerJoined") {
          setMessage(`Otro jugador se unió como ${data.player}. ¡A jugar!`);
        }
        if (data.action === "playerLeft") {
          setMessage(`El jugador ${data.player} se desconectó 😢`);
          setPlayerCount((prev) => Math.max(1, prev - 1));
        }
        if (data.action === "playerCount") {
          setPlayerCount(data.count);
        }
        if (data.action === "updateBoard") {
          setBoard(data.board);
          setTurn(data.turn);
          checkWinner(data.board);
        }
        if (data.action === "resetBoard") {
          setBoard(data.board);
          setTurn("X");
          setWinner(null);
          setWinningLine(null);
          setMessage("Juego reiniciado");
        }
        if (data.error) {
          setMessage(`⚠️ Error: ${data.error}`);
        }
      } catch (error) {
        console.error("❌ Error parseando mensaje:", error, msg.data);
      } finally {
        setLoading(false);
      }
    };

    return () => socket.close();
  }, []);

  // 📌 Enviar mensajes
  const sendMessage = (msg) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const createGame = () => {
    setLoading(true);
    sendMessage({ action: "createGame", player: "X" });
  };

  const joinGame = () => {
    if (!inputCode) {
      setMessage("⚠️ Ingresa un código de sala");
      return;
    }
    setLoading(true);
    sendMessage({ action: "joinGame", gameId: inputCode, player: "O" });
  };

  const handlePlay = (index) => {
    if (winner) return; // no seguir si ya terminó
    if (!gameId || !player) return;
    if (playerCount < 2) {
      setMessage("Esperando al otro jugador...");
      return;
    }
    if (turn !== player) {
      setMessage("No es tu turno");
      return;
    }
    if (board[index] !== null) {
      setMessage("Celda ya ocupada");
      return;
    }
    sendMessage({ action: "play", gameId, cell: index, player });
  };

  const resetGame = () => {
    if (gameId) {
      sendMessage({ action: "reset", gameId });
    }
  };

  // 📌 Verificar ganador o empate
  const checkWinner = (board) => {
    for (const combo of WINNING_COMBINATIONS) {
      const [a, b, c] = combo;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        setWinner(board[a]);
        setWinningLine(combo);
        setMessage(`🎉 Jugador ${board[a]} gana!`);
        return;
      }
    }

    if (board.every((cell) => cell !== null)) {
      setWinner("draw");
      setMessage("🤝 Empate!");
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto text-center">
      <h1 className="text-3xl font-bold mb-4">🎮 Triki en línea</h1>

      {loading && <p className="text-blue-600">⏳ Procesando...</p>}

      {!gameId && (
        <div className="space-y-4">
          <button
            onClick={createGame}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            Crear partida
          </button>

          <div className="flex items-center justify-center space-x-2">
            <input
              type="text"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Código de sala"
              className="border p-2 rounded"
            />
            <button
              onClick={joinGame}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50"
            >
              Unirse
            </button>
          </div>
        </div>
      )}

      {gameId && (
        <div className="mt-6">
          <p className="mb-2">
            Código de sala: <strong>{gameId}</strong>
          </p>
          <p className="mb-2">
            Jugador: <strong>{player}</strong>
          </p>
          <p className="mb-2">
            Jugadores conectados: <strong>{playerCount}/2</strong>
          </p>

          <div className="relative grid grid-cols-3 gap-2 w-60 h-60 mx-auto mb-4">
            {board.map((cell, idx) => (
              <div
                key={idx}
                onClick={() => handlePlay(idx)}
                className={`flex items-center justify-center border-2 rounded-lg text-3xl font-bold cursor-pointer transition ${
                  cell === "X" ? "text-blue-600" : "text-red-500"
                } ${
                  turn !== player || playerCount < 2 || winner
                    ? "opacity-50 cursor-not-allowed"
                    : ""
                }`}
              >
                {cell}
              </div>
            ))}

            {/* Línea animada si hay ganador */}
            {winningLine && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6 }}
                className="absolute bg-yellow-400 h-2 origin-left"
                style={{
                  ...LINE_STYLES[winningLine.join(",")],
                }}
              />
            )}
          </div>

          <button
            onClick={resetGame}
            className="px-4 py-2 bg-yellow-500 text-white rounded"
          >
            Reiniciar
          </button>
        </div>
      )}

      {winner && (
        <p
          className={`mt-4 text-xl font-bold ${
            winner === "draw" ? "text-gray-600" : "text-green-600"
          }`}
        >
          {winner === "draw"
            ? "🤝 ¡Empate!"
            : `🎉 Jugador ${winner} gana la partida!`}
        </p>
      )}

      {message && <p className="mt-2 text-sm text-gray-700">{message}</p>}
    </div>
  );
}
