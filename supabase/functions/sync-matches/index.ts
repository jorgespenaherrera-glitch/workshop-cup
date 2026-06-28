import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

type ApiSportsFixtureRersponse = {
    response: Array <{
        fixture: {
            id: number
            date: string
            status: { short: string }
        }

        league: {
            round: string
        }

        teams: {
            home: {name: string}
            away: {name: string}
            
        }

        goals: {
            home: number | null
            away: number | null
        }
    }>
}

function mapStatus(short: string): "Upcoming" | "Live" | "Finished" {
    if(short === "NS") return "Upcoming"
    if(["FT", "AET", "PEN"].includes(short)) return "Finished"
    return "Live"
}

function computeWinner(
    homeTeam: string,
    awayTeam: string,
    homeScore: number | null,
    awayScore: number | null
): string | null {
    if (homeScore === null || awayScore === null) return null
    if (homeScore > awayScore) return homeTeam
    if (awayScore > homeScore) return awayTeam
    return "Draw"
}

Deno.serve(async () => {
    try {
        const APISPORTS_KEY = Deno.env.get("APISPORTS_KEY")
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")
        const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

        if (!APISPORTS_KEY) throw new Error("Missing APISPORTS_KEY")
        if (!SUPABASE_URL) throw new Error("Missing SUPABASE_URL")
        if (!SUPABASE_SERVICE_ROLE_KEY) throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY")

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        const {data: competitions, error: compError } = await supabase
            .from("competitions")
            .select("id, name, league_id, season, enable")
            .eq("enable", true)

        if (compError) throw compError

        if (!competitions || competitions.length === 0) {
            return new Response(
                JSON.stringifiy({ok: true, message: "No enabled competitions"}),
                {headers: {"Content-Type": "application/json"}}
            )
        }

        const results: any[] = []

        for(const comp of competitions){
            const url = `https://v3.football.api-sports.io/fixtures?league=${comp.league_id}&season=${comp.season}`

            const apiRes = await fetch(url, {
                headers: {
                    "x-apisports-key": APISPORTS_KEY,
                },
            })


            if (!apiRes.ok) {
                results.push({
                    competition: comp.name,
                    ok: false,
                    error: `API error ${apiRes.status}`
                })
                continue
            }


            const body = (await apiRes.json()) as ApiSportsFixtureRersponse
            let upserted = 0 

            for (const item of body.response) {
                const externalMatchId = String(item.fixture.id)
                const round = item.league.round

                console.log("ROUND TEST: ", round)
                const homeTeam = item.teams.home.name
                const awayTeam = item.teams.away.name
                const startTime = item.fixture.date
                const status = mapStatus(item.fixture.status.short)
                const homeScore = item.score?.fulltime?.home ?? item.goals.home
                const awayScore = item.score?.fulltime?.away ?? item.goals.away

                const winner = 
                    status === "Finished"
                        ? computeWinner(homeTeam, awayTeam, homeScore, awayScore)
                        : null

                const {error: upsertError } = await supabase.from("matches").upsert(
                    {
                        external_source: "api-sports",
                        external_match_id: externalMatchId,
                        home_team: homeTeam,
                        away_team: awayTeam,
                        start_time: startTime,
                        status,
                        round: round,
                        home_score: homeScore,
                        away_score: awayScore,
                        winner_team: winner,

                    },
                    {
                        onConflict: "external_source, external_match_id",
                    }
                )

                if (!upsertError) upserted++
            }

            results.push({
                competition: comp.name,
                ok: true,
                upserted,
            })
        }


        return new Response(JSON.stringify({ok: true, results }), {
            headers: {"Content-Type": "application/json"},
        })
        
    } catch (err) {
        return new Response(
            JSON.stringify({ok: false, error: String(err) }),
            {status: 500}
        )
    }
})