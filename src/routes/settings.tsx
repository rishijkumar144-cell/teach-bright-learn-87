import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { TeacherLayout } from "@/components/teacher/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { teacher, updateTeacher } = useStore();
  if (!teacher) return null;

  return (
    <TeacherLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your profile. Accessibility tools live in the top-right toolbar.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="card-soft">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Profile</h2>
            <div className="space-y-2">
              <Label>Display name</Label>
              <Input
                defaultValue={teacher.displayName}
                onBlur={(e) => {
                  if (e.target.value !== teacher.displayName)
                    updateTeacher({ displayName: e.target.value });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>School</Label>
              <Input
                defaultValue={teacher.school}
                placeholder="e.g. Lincoln Middle School"
                onBlur={(e) => {
                  if (e.target.value !== teacher.school)
                    updateTeacher({ school: e.target.value });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={teacher.email} disabled />
            </div>
            <Button onClick={() => toast.success("Profile saved")} className="mt-2">
              Save changes
            </Button>
          </CardContent>
        </Card>

        <Card className="card-soft">
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">Accessibility promise</h2>
            <p className="text-sm text-muted-foreground">
              Questly is built with WCAG-compliant contrast, large hit targets, full keyboard
              navigation, and support for assistive technologies. Use the toolbar at the top of
              every page to switch theme, enable a dyslexia-friendly font, boost contrast, and
              adjust text size and line spacing — for you and your students.
            </p>
          </CardContent>
        </Card>
      </div>
    </TeacherLayout>
  );
}
