; NSIS Configuration Script for "مشويات الباشا POS" Commercial Application
; Supports: Silent install, Desktop & Start Menu shortcuts, Safe Uninstall (Preserves Restaurant Data)

!define APP_NAME "مشويات الباشا POS"
!define APP_NAME_EN "MosawyatAlBashaPOS"
!define APP_VERSION "1.0.0"
!define APP_PUBLISHER "El Basha Grill Software"
!define APP_EXE "${APP_NAME_EN}.exe"

; General Settings
Name "${APP_NAME}"
OutFile "dist-installer\${APP_NAME_EN}-Setup-v${APP_VERSION}.exe"
InstallDir "$PROGRAMFILES64\${APP_NAME_EN}"
InstallDirRegKey HKLM "Software\${APP_NAME_EN}" "Install_Dir"
RequestExecutionLevel admin

; UI Configuration
!include "MUI2.nsh"
!define MUI_ABORTWARNING
!define MUI_ICON "public\favicon.ico"
!define MUI_UNICON "public\favicon.ico"

; Installer Pages
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_LICENSE "LICENSE.txt"
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

; Uninstaller Pages
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_UNPAGE_FINISH

!insertmacro MUI_LANGUAGE "Arabic"
!insertmacro MUI_LANGUAGE "English"

Section "MainSection" SEC01
  SetOutPath "$INSTDIR"
  
  ; Application binary and bundled files
  File /r "dist\*.*"
  
  ; Create Desktop and Start Menu Shortcuts
  CreateDirectory "$SMPROGRAMS\${APP_NAME}"
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\public\favicon.ico" 0
  CreateShortCut "$DESKTOP\${APP_NAME}.lnk" "$INSTDIR\${APP_EXE}" "" "$INSTDIR\public\favicon.ico" 0
  CreateShortCut "$SMPROGRAMS\${APP_NAME}\Uninstall.lnk" "$INSTDIR\uninstall.exe"
  
  ; Initialize Windows LocalAppData writable directory (%LOCALAPPDATA%\MosawyatAlBashaPOS)
  CreateDirectory "$LOCALAPPDATA\${APP_NAME_EN}\data"
  CreateDirectory "$LOCALAPPDATA\${APP_NAME_EN}\logs"
  CreateDirectory "$LOCALAPPDATA\${APP_NAME_EN}\backups"

  ; Registry Keys for Windows Add/Remove Programs
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_EN}" "DisplayName" "${APP_NAME} Commercial POS"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_EN}" "UninstallString" "$INSTDIR\uninstall.exe"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_EN}" "DisplayIcon" "$INSTDIR\public\favicon.ico"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_EN}" "Publisher" "${APP_PUBLISHER}"
  WriteRegStr HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_EN}" "DisplayVersion" "${APP_VERSION}"

  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

; Safe Uninstallation Section (Protects Restaurant Data!)
Section "Uninstall"
  ; Prompt user to choose whether to keep or remove restaurant database
  MessageBox MB_YESNO|MB_ICONQUESTION "هل ترغب في الاحتفاظ ببيانات المطعم وقاعدة البيانات والمبيعات؟$\n$\nاضغط (نعم) للاحتفاظ بالبيانات بأمان، أو (لا) للمسح الشامل." IDYES KeepData IDNO DeleteData

  DeleteData:
    RMDir /r "$LOCALAPPDATA\${APP_NAME_EN}"
    Goto ContinueUninstall

  KeepData:
    DetailPrint "تم الاحتفاظ ببيانات وقاعدة بيانات المطعم في: $LOCALAPPDATA\${APP_NAME_EN}"

  ContinueUninstall:
    ; Delete Program Files and shortcuts
    Delete "$DESKTOP\${APP_NAME}.lnk"
    RMDir /r "$SMPROGRAMS\${APP_NAME}"
    RMDir /r "$INSTDIR"

    DeleteRegKey HKLM "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP_NAME_EN}"
    DeleteRegKey HKLM "Software\${APP_NAME_EN}"
SectionEnd
