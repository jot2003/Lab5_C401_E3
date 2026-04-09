"use client";

import Link from "next/link";
import { MessageSquare, Calendar, CheckCircle, ArrowRight } from "lucide-react";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";

const STEPS = [
  {
    step: 1,
    title: "Mô tả yêu cầu",
    description: "Nhập bằng ngôn ngữ tự nhiên, VinAgent sẽ hiểu ý bạn.",
    icon: MessageSquare,
  },
  {
    step: 2,
    title: "Xem phương án",
    description: "Hiển thị lịch học trên calendar, so sánh Plan A/B.",
    icon: Calendar,
  },
  {
    step: 3,
    title: "Xác nhận & đăng ký",
    description: "Kiểm tra nguồn, xác nhận phương án và tiến hành đăng ký.",
    icon: CheckCircle,
  },
];

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-1px)] flex-col items-center justify-center px-4 py-12">
      <FadeIn>
        <div className="flex flex-col items-center text-center">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold mb-4">
            VA
          </div>
          <h1 className="text-2xl font-semibold tracking-tight leading-tight text-[#B72025] dark:text-white">
            Cố vấn học vụ thông minh
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
            Tối ưu đăng ký học phần bằng ngôn ngữ tự nhiên.
            Mọi đề xuất đều có trích dẫn nguồn và có thể kiểm chứng.
          </p>
        </div>
      </FadeIn>

      <Stagger className="mt-8 grid w-full max-w-xl gap-3 md:grid-cols-3">
        {STEPS.map((s) => (
          <StaggerItem key={s.step}>
            <Card className="border-border/50 bg-[#B72025]/5 dark:bg-zinc-900 hover:border-border transition-colors">
              <CardContent className="flex flex-col items-center p-4 text-center">
                <div className="flex size-9 items-center justify-center rounded-md bg-[#B72025] dark:bg-zinc-700">
                  <s.icon className="size-4 text-white" />
                </div>
                <span className="mt-3 flex size-5 items-center justify-center rounded-full bg-[#B72025] dark:bg-white text-[10px] font-bold text-white dark:text-black">
                  {s.step}
                </span>
                <h3 className="mt-2 text-sm font-semibold leading-normal text-[#B72025] dark:text-white">{s.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  {s.description}
                </p>
              </CardContent>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <FadeIn delay={0.2}>
        <Link
          href="/tao-ke-hoach"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/80"
        >
          Bắt đầu tạo lịch học
          <ArrowRight className="size-4" />
        </Link>
      </FadeIn>
    </div>
  );
}
