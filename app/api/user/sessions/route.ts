import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { withUserScope } from "@/lib/db-context";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
export async function GET(){const session=await getServerSession(authOptions);if(!session?.user?.id)return NextResponse.json({error:"Unauthorized"},{status:401});const limited=await enforceRateLimit(`user-sessions:${session.user.id}`,RATE_LIMITS.authedReadModerate);if(limited)return limited;const sessions=await withUserScope(session.user.id,(tx)=>tx.loginSession.findMany({where:{userId:session.user.id},orderBy:{lastSeenAt:"desc"},take:20}));return NextResponse.json({sessions});}
