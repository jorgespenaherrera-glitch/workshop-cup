import { useEffect, useState } from "react"
import { supabase } from "./supabaseClient"

type Match = {
  id: string
  home_team: string
  away_team: string
  start_time: string
  status: string
  home_score: number | null
  away_score: number | null
  winner_team: string | null
  round: string | null
}

type Prediction = {
  id: string
  match_id:string
  predicted_winner: string
  created_at: string
  matches: {
    home_team: string
    away_team: string
    start_time:string 
    winner_team: string | null
  } | null
}

type Standings = {
  user_id: string
  username: string
  points: number
}


const flags: Record<string, string> = {
  "Mexico": "🇲🇽",
  "South Africa": "🇿🇦",
  "South Korea": "🇰🇷",
  "Czech Republic": "🇨🇿",
  "Canada": "🇨🇦",
  "Bosnia & Herzegovina": "🇧🇦",
  "USA": "🇺🇸",
  "Paraguay": "🇵🇾",
  "Qatar": "🇶🇦",
  "Switzerland": "🇨🇭",
  "Brazil": "🇧🇷",
  "Morocco": "🇲🇦",
  "Haiti": "🇭🇹",
  "Scotland": "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  "Australia": "🇦🇺",
  "Türkiye": "🇹🇷",
  "Germany": "🇩🇪",
  "Curaçao": "🇨🇼",
  "Ecuador": "🇪🇨",
  "Ivory Coast": "🇨🇮",

  "Netherlands": "🇳🇱",
  "Japan": "🇯🇵",
  "Sweden": "🇸🇪",
  "Tunisia": "🇹🇳",

  "Belgium": "🇧🇪",
  "Egypt": "🇪🇬",
  "Iran": "🇮🇷",
  "New Zealand": "🇳🇿",

  "Spain": "🇪🇸",
  "Cape Verde": "🇨🇻",
  "Saudi Arabia": "🇸🇦",
  "Uruguay": "🇺🇾",

  "France": "🇫🇷",
  "Senegal": "🇸🇳",
  "Iraq": "🇮🇶", 
  "Norway": "🇳🇴",

  "Argentina": "🇦🇷",
  "Algeria": "🇩🇿",
  "Austria": "🇦🇹",
  "Jordan": "🇯🇴",

  "Portugal": "🇵🇹",
  "Congo DR": "🇨🇩",
  "DR Congo": "🇨🇩",
  "Uzbekistan": "🇺🇿",
  "Colombia": "🇨🇴",

  "England": "🏴",
  "Croatia": "🇭🇷",
  "Ghana": "🇬🇭",
  "Panama": "🇵🇦"
}

function getFlag(team: string) {
  return flags[team] || "🏳️"
}



export default function App() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isResettingPassword, setIsResettingPassword] = useState(false)
  const[newPassword, setNewPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isSignup, setIsSignup] = useState(false)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [standings, setStandings] = useState<Standings[]>([])
  const [page, setPage] = useState<"matches" | "leaderboard">("matches")

  useEffect(() =>{
    supabase.auth.getUser().then(({data}) => {
      setUserEmail(data.user?.email ?? null)
    })
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY"){
        setIsResettingPassword(true)
      }
    })
  }, []) 


  useEffect(() =>{
    if (!userEmail) return
    loadMatches()
    laodMyPredictions()
    loadStandings()
  }, [userEmail])

  async function signUp() {
  if (!username.trim()) {
    alert("Please enter a username")
    return
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: username.trim(),
      },
    },
  })

  if (error) {
    alert(error.message)
    return
  }

  alert("Signed up. Now you can log in.")
}

  async function signIn() {
    const {error} = await supabase.auth.signInWithPassword({email, password})
    if(error) alert(error.message)
    else {
      const{data} = await supabase.auth.getUser()
      setUserEmail(data.user?.email ?? null)
    }
  }

  async function resetPassword(){
    if(!email){
      alert("Enter your email first")
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: "https://workshop-cup.vercel.app"
      }
    ) 
    if (error){
      alert(error.message)
    } else{
      alert("Password reset email sent")
    }
  }

  async function updatePassword() {
    if(!newPassword){
      alert("Enter a new Password")
      return
    }
    const {error} = await supabase.auth.updateUser({
      password: newPassword,
    })
    if (error){
      alert(error.message)
      return
    }
    alert("Password Updated. Please log in again")
    setIsResettingPassword(false)
    setNewPassword("")
    await supabase.auth.signOut()
    setUserEmail(null)
  }

  async function signOut() {
    await supabase.auth.signOut()
    setUserEmail(null)
    setMatches([])
    
  }

  async function loadMatches() {
    const {data, error} = await supabase
      .from("matches")
      .select("id, home_team, away_team, start_time, status, home_score, away_score, winner_team, round")
      .order("start_time", {ascending: true})

    if (error) alert(error.message)
    else setMatches(data ?? [])

  }

  async function laodMyPredictions(){
    const {data: userData} = await supabase.auth.getUser()
    const uid = userData.user?.id
    if(!uid) return 

    const {data, error} = await supabase
      .from("predictions")
      .select("id, match_id, predicted_winner, created_at, matches(home_team, away_team, start_time, winner_team)")
      .eq("user_id", uid)
      .order("created_at", { ascending: false})

    if(error){
      alert(error.message)
    } else {
      setPredictions((data ?? []) as unknown as Prediction[])
    }

  }

  async function loadStandings(){
    const { data, error } = await supabase
      .from("standings")
      .select("*")
      .order("points", {ascending: false})

      if(error){
        console.error(error)
        return
      }

      setStandings(data || [])
  }

  async function predict(matchId:string, winnerPick: string) {
    const {data:userData} = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid){
      alert("Not logged in")
      return
    }

    const {error} = await supabase.from("predictions").upsert({
      user_id: uid,
      match_id: matchId,
      predicted_winner: winnerPick,
      },
      {
        onConflict: "user_id, match_id",
      }
    )
    
    if(error) alert(error.message)
    else alert("prediction saved!")
    await laodMyPredictions()
  }

  const upcomingMatches = matches.filter((m) => m.status?.toLowerCase() !== "finished")
  const finishedMatches = matches.filter((m) => m.status?.toLowerCase() == "finished")

  const groupMatches = upcomingMatches.filter(
    m => m.round?.toLowerCase().includes("group")
  )

  const knockoutMatches = upcomingMatches.filter(
    m => !m.round?.toLowerCase().includes("group")
  )

  function getMyPick(matchId:string){
    const prediction = predictions.find(
      (p) => p.match_id === matchId
    )
    return prediction?.predicted_winner ?? null
  }

  if(isResettingPassword){
    return(
      <div style={{ padding: 20}}>
        <h2>Reset Password</h2>
        <input 
          placeholder="new Password"
          type = "password"
          value = {newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <br />

        <button onClick={updatePassword}>
          Update Password
        </button>
      </div>
    )
  }
  
  if(!userEmail){
    return(
      <div style = {{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}>
        <div style = {{padding: 20}}>
        <h2>WorldCup - Login</h2>

        <div style = {{marginBottom: 20 }}>
          <button onClick={() => setIsSignup(false)}>
            Log In
          </button>

          <button
            onClick={() => setIsSignup(true)}
            style={{marginLeft: 10}}
          >
            Sign Up
            
          </button>
        </div>
                
        <input
          placeholder = "email"
          value = {email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <br />

        <input
          placeholder = "password"
          type = "password"
          value = {password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br />

        {isSignup && (
          <>
            <input
              placeholder="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            <br />
         </>
        )}

        <button onClick={isSignup ? signUp : signIn}>
          {isSignup ? "Create Account" : "Log In"}
        </button>
          <div style={{marginTop: 10}}> 
            <button
              onClick = {resetPassword}
              style = {{
                background: "none",
                border: "none",
                color: "blue",
                cursor: "pointer"
              }}
            >
              Forgot Password?
            </button>
          </div>
      </div>
    </div>
    )
  }

  return(
    <div 
      style={{ 
        padding: 20,
        maxWidth: 900,
        margin: "0 auto", 
      }}
    >

    <div
      style={{
        display: "flex",
        justifyContent: "flex-end"
      }}
    >
      <button onClick={signOut}>
        Sign out
      </button>
    </div>

    <div
      style={{
        textAlign: "center",
        marginBottom: 30
      }}
    >
      <h1 style={{ marginBottom: 10 }}>
        🏆 World Cup 2026 🏆
      </h1>

      <p>
        What will your predictions for the World Cup be...
      </p>
    </div>
      <div 
        style = {{
        marginBottom:20,
        display: "flex",
        justifyContent: "center",
        gap: 10
        }}
        >
          <button onClick={() => setPage("matches")}>Matches</button>

          <button
            onClick={() => setPage("leaderboard")}
          >
            Leaderboard
          </button>
        </div>
      {page === "matches" && (
        <>

      <h3 style={{ marginTop: 20 }}>🏆 Group Stage</h3>

{groupMatches.length === 0 && (
  <p>No Group Stage Matches</p>
)}

{groupMatches.map((m) => {
    const locked = 
      new Date(m.start_time).getTime() - Date.now() <= 10 * 60 * 1000
    return(
      <div key={m.id} style={{ 
        marginBottom: 16, 
        padding: 16,
        border: "1px solid #ddd",
        borderRadius: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        background: "rgba(255, 255, 255, 0.03)"
      }}
      >

        <div
          style={{
            fontSize: 22,
            fontWeight: "bold",
            marginBottom: 10
          }}
        >
          {getFlag(m.home_team)} {m.home_team} {" "} ⚽ {" "}{getFlag(m.away_team)} {m.away_team}
        </div>

        <div
          style={{
            color: "#bdbdbd",
            fontSize: 14,
            marginBottom: 12
          }}
        >
          Start🕒: {new Date(m.start_time).toLocaleString("en-US", {
            timeZone: "America/New_York",
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
            })}
        </div>

        {locked && <div>Predictions Locked 🔒</div>}

        <button disabled = {locked} onClick={() => predict(m.id, m.home_team)} style={{
          background: getMyPick(m.id) === m.home_team ? "#90EE90" : "",
        }}>
         {m.home_team}
        </button>

       <button
          disabled={locked}
          onClick={() => predict(m.id, m.away_team)}
          style={{ 
            marginLeft: 8, 
            background: getMyPick(m.id) === m.away_team ? "#90EE90" : "",
          }}
        >
          {m.away_team}
        </button>

        <button
          disabled = {locked}
          onClick={() => predict(m.id, "Draw")}
          style={{ 
            marginLeft: 8, 
            background: getMyPick(m.id) === "Draw" ? "#90EE90" : "",
          }}
        >
          Draw
        </button>

      </div>
        )
    })}

<h3 style={{ marginTop: 30 }}>
🔥 Knockout Stage
</h3>

{knockoutMatches.length === 0 && (
  <p>No Knockout Matches</p>
)}

{knockoutMatches.map((m) => (
  <div key={m.id} style={{ 
    marginBottom: 12,  
    padding: 16,
    border: "1px solid #ddd",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    background: "rgba(255, 255, 255, 0.03)"
  }}
  >

    <div>
      <b>{m.home_team}</b> vs <b>{m.away_team}</b>
    </div>

    <div
      style={{
        color: " #bdbdbd ",
        fontSize: 14,
        marginBottom: 12
      }}
    >
      Start🕒: {new Date(m.start_time).toLocaleString()}
    </div>

    <button onClick={() => predict(m.id, m.home_team)}>
      {m.home_team}
    </button>

    <button
      onClick={() => predict(m.id, m.away_team)}
      style={{ marginLeft: 8 }}
    >
      {m.away_team}
    </button>

    <button
      onClick={() => predict(m.id, "Draw")}
      style={{ marginLeft: 8 }}
    >
      Draw
    </button>

  </div>
))}

      <h3 style = {{marginTop: 30}}>Finished Matches</h3>

      {finishedMatches.length === 0 && <p>No finished Matches.</p>}

      {finishedMatches.map((m) => (
        <div 
        key = {m.id} 
        style = {{
          marginBottom:12,
          padding:12,
          border:"1px solid #555",
          borderRadius: 8,
          }}
        >
          <div>
            <b>{m.home_team}</b> vs <b>{m.away_team}</b>
          </div>

          <div>
            Final Score: {m.home_score ?? "-"} - {m.away_score ?? "-"}
          </div>

          <div>
            Winner: {m.winner_team ?? "No winner Recorded"}
          </div>
        </div>
      ))}
      </>
      )}

      {page === "leaderboard" && (
        <>
          <h3 style={{marginTop: 30 }}>Leaderboard</h3>

          {standings.length === 0 && <p>No standings yet.</p>}

          {standings.map((s, index) =>  (
            <div key={s.user_id} style={{ marginBottom: 8}}>
              <b>{index + 1}.</b> {s.username} - <b>{s.points}</b> points
            </div>
          ))}

          <h3 style = {{marginTop: 30 }} >My Predictions</h3>

      {predictions.length === 0 && <p>No Predictions yet.</p>}

      {predictions.map((p) => {
        const m = p.matches
        const outcome = 
          m?.winner_team == null
          ? "Pending"
          : p.predicted_winner === m.winner_team
          ? "Correct! (+1)"
          :"Wrong :("

        return(
          <div key={p.id} style={{ marginBottom: 10}}>
            <div>
              {m ? (
                <>
                  <b>{m.home_team}</b> vs <b>{m.away_team}</b> - Pick: <b>{p.predicted_winner}</b>
                </>
              ) : (
                <>Match not Found - Pick: <b>{p.predicted_winner}</b></>
              )}
            </div>
            <div>{outcome}</div>
          </div>
        )
      })

      }
        </>
      )}

    </div>
  )

}