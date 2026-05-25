import { NextResponse } from 'next/server';
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import dbConnect from '@/lib/mongodb';
import Topic from '@/models/Topic';

export async function GET(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;
  
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');
    
    const targetDate = dateParam ? new Date(dateParam) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    // Topics due today
    const topics = await Topic.find({
      userEmail,
      'reviews': {
        $elemMatch: {
          scheduledFor: {
            $gte: targetDate,
            $lte: endOfDay
          },
          completed: false
        }
      }
    }).sort({ createdAt: -1 });

    // Upcoming topics
    const nextWeek = new Date(endOfDay);
    nextWeek.setDate(nextWeek.getDate() + 14);
    
    const upcoming = await Topic.find({
      userEmail,
      'reviews': {
        $elemMatch: {
          scheduledFor: {
            $gt: endOfDay,
            $lte: nextWeek
          },
          completed: false
        }
      }
    }).sort({ createdAt: -1 });

    // KPIs calculation
    const totalTopics = await Topic.countDocuments({ userEmail });
    
    // Completion rate
    const allTopics = await Topic.find({ userEmail });
    let totalReviews = 0;
    let completedReviews = 0;
    allTopics.forEach(t => {
      t.reviews.forEach(r => {
        totalReviews++;
        if (r.completed) completedReviews++;
      });
    });
    const completionRate = totalReviews === 0 ? 0 : Math.round((completedReviews / totalReviews) * 100);

    return NextResponse.json({ 
      today: topics, 
      upcoming,
      kpis: {
        totalTopics,
        actionableToday: topics.length,
        completionRate,
        upcomingCount: upcoming.length
      }
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { subject, name, logDate } = await request.json();
    
    const baseDate = logDate ? new Date(logDate) : new Date();
    
    // 147 Theory logic: "1 means 0", review on 4th day, then 7 days after that (day 11).
    const intervals = [4, 11];
    const reviews = intervals.map(days => {
      const scheduledDate = new Date(baseDate);
      scheduledDate.setDate(scheduledDate.getDate() + days);
      return {
        scheduledFor: scheduledDate,
        completed: false
      };
    });

    const newTopic = await Topic.create({
      subject: subject || "General",
      name,
      userEmail: session.user.email,
      createdAt: baseDate,
      reviews
    });
    
    return NextResponse.json({ success: true, data: newTopic });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await dbConnect();
    const { topicId, reviewId } = await request.json();
    
    const topic = await Topic.findOneAndUpdate(
      { _id: topicId, "reviews._id": reviewId, userEmail: session.user.email },
      { $set: { "reviews.$.completed": true } },
      { new: true }
    );
    
    return NextResponse.json({ success: true, data: topic });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
