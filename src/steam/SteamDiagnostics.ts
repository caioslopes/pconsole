import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export interface SteamProcessInfo {
  id: number;
  processName: string;
  mainWindowTitle: string;
  mainWindowHandle: string;
  path: string | null;
  responding: boolean | null;
}

export interface SteamWindowInfo {
  processId: number;
  processName: string;
  title: string;
  className: string;
  handle: string;
}

export interface SteamDiagnosticsSnapshot {
  platform: NodeJS.Platform;
  capturedAt: string;
  processes: SteamProcessInfo[];
  windows: SteamWindowInfo[];
}

export async function getSteamDiagnosticsSnapshot(): Promise<SteamDiagnosticsSnapshot> {
  if (process.platform !== 'win32') {
    return {
      platform: process.platform,
      capturedAt: new Date().toISOString(),
      processes: [],
      windows: []
    };
  }

  const { stdout } = await execFileAsync('powershell.exe', [
    '-NoProfile',
    '-NonInteractive',
    '-Command',
    windowsDiagnosticsScript
  ]);

  const parsed = JSON.parse(stdout) as Omit<SteamDiagnosticsSnapshot, 'platform' | 'capturedAt'>;

  return {
    platform: process.platform,
    capturedAt: new Date().toISOString(),
    processes: parsed.processes ?? [],
    windows: parsed.windows ?? []
  };
}

const windowsDiagnosticsScript = `
Add-Type @"
using System;
using System.Text;
using System.Runtime.InteropServices;
using System.Collections.Generic;

public static class WindowEnumerator {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int count);

  [DllImport("user32.dll", CharSet = CharSet.Unicode)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder className, int count);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  public class WindowInfo {
    public uint ProcessId;
    public string Title;
    public string ClassName;
    public string Handle;
  }

  public static List<WindowInfo> GetVisibleWindows() {
    List<WindowInfo> windows = new List<WindowInfo>();

    EnumWindows(delegate (IntPtr hWnd, IntPtr lParam) {
      if (!IsWindowVisible(hWnd)) {
        return true;
      }

      StringBuilder title = new StringBuilder(1024);
      StringBuilder className = new StringBuilder(256);
      GetWindowText(hWnd, title, title.Capacity);
      GetClassName(hWnd, className, className.Capacity);
      uint processId;
      GetWindowThreadProcessId(hWnd, out processId);

      windows.Add(new WindowInfo {
        ProcessId = processId,
        Title = title.ToString(),
        ClassName = className.ToString(),
        Handle = "0x" + hWnd.ToInt64().ToString("x")
      });

      return true;
    }, IntPtr.Zero);

    return windows;
  }
}
"@

$processes = Get-Process | Where-Object {
  $_.ProcessName -like "steam*" -or $_.Path -like "*Steam*"
} | ForEach-Object {
  [PSCustomObject]@{
    id = $_.Id
    processName = $_.ProcessName
    mainWindowTitle = $_.MainWindowTitle
    mainWindowHandle = "0x" + $_.MainWindowHandle.ToInt64().ToString("x")
    path = $_.Path
    responding = $_.Responding
  }
}

$processById = @{}
foreach ($process in $processes) {
  $processById[$process.id] = $process
}

$windows = [WindowEnumerator]::GetVisibleWindows() | Where-Object {
  $processById.ContainsKey([int]$_.ProcessId) -or $_.Title -like "*Steam*" -or $_.ClassName -like "*Steam*"
} | ForEach-Object {
  $processName = $null
  if ($processById.ContainsKey([int]$_.ProcessId)) {
    $processName = $processById[[int]$_.ProcessId].processName
  }

  [PSCustomObject]@{
    processId = [int]$_.ProcessId
    processName = $processName
    title = $_.Title
    className = $_.ClassName
    handle = $_.Handle
  }
}

[PSCustomObject]@{
  processes = @($processes)
  windows = @($windows)
} | ConvertTo-Json -Depth 6
`;
