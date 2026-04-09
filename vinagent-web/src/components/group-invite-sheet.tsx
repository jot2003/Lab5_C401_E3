"use client";

import { useState } from "react";
import { Users, Send } from "lucide-react";
import { toast } from "sonner";
import { useBKAgent } from "@/lib/store";
import studentData from "@/lib/mock/student.json";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Friend = { id: string; name: string };

const GROUP_FRIENDS: Friend[] = (
  studentData as { groupFriends: Friend[] }
).groupFriends;

export function GroupInviteSheet() {
  const store = useBKAgent();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(id: string) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSend() {
    if (selected.length === 0) return;
    const names = GROUP_FRIENDS.filter((f) => selected.includes(f.id)).map(
      (f) => f.name
    );
    const prompt = `Tôi muốn đăng ký cùng ${names.join(" và ")}. Hãy tìm các slot không xung đột cho cả nhóm và tạo lịch chung tối ưu nhất.`;

    toast("Đã gửi lời mời!", {
      description: `${names.join(", ")} sẽ nhận được gợi ý lịch học cùng bạn.`,
    });

    store.closeGroupInvite();
    setSelected([]);
    store.generate(prompt);
  }

  return (
    <Sheet
      open={store.groupInviteOpen}
      onOpenChange={(open) => !open && store.closeGroupInvite()}
    >
      <SheetContent className="w-[480px] max-w-[90vw] overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-primary" />
            <SheetTitle className="text-sm font-semibold">
              Mời bạn đăng ký cùng
            </SheetTitle>
          </div>
          <SheetDescription className="text-xs">
            Chọn bạn trong nhóm học. BKAgent sẽ tìm slot chung không xung đột
            cho cả nhóm.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            {GROUP_FRIENDS.map((friend) => (
              <label
                key={friend.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-muted/30",
                  selected.includes(friend.id) &&
                    "border-primary/30 bg-primary/5"
                )}
              >
                <Checkbox
                  id={friend.id}
                  checked={selected.includes(friend.id)}
                  onCheckedChange={() => toggle(friend.id)}
                />
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary"
                  >
                    {friend.name
                      .split(" ")
                      .slice(-1)[0]
                      .charAt(0)
                      .toUpperCase()}
                  </span>
                  <div>
                    <p className="text-xs font-medium leading-normal">
                      {friend.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-normal">
                      MSSV {friend.id}
                    </p>
                  </div>
                </div>
              </label>
            ))}
          </div>

          <Separator className="opacity-30" />

          <p className="text-xs text-muted-foreground leading-relaxed">
            BKAgent sẽ tìm các lớp có slot chung cho{" "}
            {selected.length > 0 ? `bạn và ${selected.length} người bạn đã chọn` : "cả nhóm"}{" "}
            và tự động điều chỉnh kế hoạch.
          </p>

          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 gap-1.5 text-xs"
              disabled={selected.length === 0}
              onClick={handleSend}
            >
              <Send className="size-3" />
              Gửi lời mời ({selected.length} người)
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={() => {
                setSelected([]);
                store.closeGroupInvite();
              }}
            >
              Hủy
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
