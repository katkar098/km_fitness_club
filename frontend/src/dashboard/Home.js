import React from "react";
import SideBar from "./SideBar";

function Home({ children }) {
  return (
    <div>
      <SideBar />

      <main className="dashboard-content"
        style={{
          marginLeft: "280px",
          minHeight: "100vh",
          padding: "20px",
          backgroundColor: "#f8f9fa"
        }}
      >
        {children}
      </main>
    </div>
  );
}

export default Home;
