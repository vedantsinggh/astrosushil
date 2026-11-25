const Loader = () => {
  return (
    <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
      <div className="relative w-20 h-20">
        <span style={styles.ring(0)} />
        <span style={styles.ring(1)} />
        <span style={styles.ring(2)} />
        <span style={styles.star}>✦</span>
      </div>

      <style>{`
        @keyframes loader-pulse {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes loader-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  ring: (i) => ({
    position: "absolute",
    inset: 0,
    borderRadius: "50%",
    border: "2px solid rgba(66,72,116,0.3)",
    animation: `loader-pulse 2s ease-in-out ${i * 0.6}s infinite`,
  }),
  star: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "28px",
    color: "#424874",
    animation: "loader-spin 3s linear infinite",
  },
};

export default Loader;
