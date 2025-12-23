import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Settings, useSettings } from "@/hooks/useSettings";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SettingsDialogProps {
    settings: Settings;
    updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ settings, updateSetting, open, onOpenChange }: SettingsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-white">
                    <SettingsIcon size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1E1E24] border-[#333] text-white">
                <DialogHeader>
                    <DialogTitle>Editor Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Theme */}
                    <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select
                            value={settings.theme}
                            onValueChange={(v) => updateSetting('theme', v as any)}
                        >
                            <SelectTrigger className="bg-[#252526] border-[#333]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#252526] border-[#333] text-white">
                                <SelectItem value="vs-dark">Dark (Visual Studio)</SelectItem>
                                <SelectItem value="light">Light</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Font Size */}
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <Label>Font Size</Label>
                            <span className="text-xs text-gray-400">{settings.fontSize}px</span>
                        </div>
                        <Slider
                            value={[settings.fontSize]}
                            min={10}
                            max={24}
                            step={1}
                            onValueChange={([v]) => updateSetting('fontSize', v)}
                            className="py-4"
                        />
                    </div>

                    {/* Word Wrap */}
                    <div className="flex items-center justify-between">
                        <Label>Word Wrap</Label>
                        <Switch
                            checked={settings.wordWrap === 'on'}
                            onCheckedChange={(checked) => updateSetting('wordWrap', checked ? 'on' : 'off')}
                        />
                    </div>

                    {/* Minimap */}
                    <div className="flex items-center justify-between">
                        <Label>Minimap</Label>
                        <Switch
                            checked={settings.minimap}
                            onCheckedChange={(checked) => updateSetting('minimap', checked)}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
