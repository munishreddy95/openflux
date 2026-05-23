Unicode true
RequestExecutionLevel user
SetCompressor /SOLID lzma

!include "MUI2.nsh"

!define APP_NAME "OpenFlux"
!define APP_VERSION "{{APP_VERSION}}"
!define INSTALL_DIR "$LOCALAPPDATA\Programs\OpenFlux"
!define REG_KEY "Software\OpenFlux"
!define BUNDLE_DIR "{{BUNDLE_DIR}}"
!define OUTPUT_EXE "{{OUTPUT_EXE}}"

Name "${APP_NAME} ${APP_VERSION}"
OutFile "${OUTPUT_EXE}"
InstallDir "${INSTALL_DIR}"
InstallDirRegKey HKCU "${REG_KEY}" "InstallDir"
BrandingText "OpenFlux Installer"

!define MUI_ABORTWARNING
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!define MUI_FINISHPAGE_RUN "$INSTDIR\start-openflux.cmd"
!define MUI_FINISHPAGE_RUN_TEXT "Start OpenFlux after setup"
!insertmacro MUI_PAGE_FINISH

!insertmacro MUI_LANGUAGE "English"

Section "Install"
  IfFileExists "$INSTDIR\Uninstall OpenFlux.exe" 0 +2
  ExecWait '"$INSTDIR\Uninstall OpenFlux.exe" /S _?=$INSTDIR'

  SetOutPath "$INSTDIR"
  File /r "${BUNDLE_DIR}\*.*"

  WriteRegStr HKCU "${REG_KEY}" "InstallDir" "$INSTDIR"
  WriteUninstaller "$INSTDIR\Uninstall OpenFlux.exe"

  CreateDirectory "$SMPROGRAMS\OpenFlux"
  CreateShortCut "$SMPROGRAMS\OpenFlux\Start OpenFlux.lnk" "$INSTDIR\start-openflux.cmd"
  CreateShortCut "$SMPROGRAMS\OpenFlux\OpenFlux CLI.lnk" "$INSTDIR\openflux.cmd"
  CreateShortCut "$SMPROGRAMS\OpenFlux\View Config.lnk" "$INSTDIR\openflux-config.cmd"
  CreateShortCut "$SMPROGRAMS\OpenFlux\Uninstall OpenFlux.lnk" "$INSTDIR\Uninstall OpenFlux.exe"
  CreateShortCut "$DESKTOP\OpenFlux.lnk" "$INSTDIR\start-openflux.cmd"
SectionEnd

Section "Uninstall"
  Delete "$DESKTOP\OpenFlux.lnk"
  Delete "$SMPROGRAMS\OpenFlux\Start OpenFlux.lnk"
  Delete "$SMPROGRAMS\OpenFlux\OpenFlux CLI.lnk"
  Delete "$SMPROGRAMS\OpenFlux\View Config.lnk"
  Delete "$SMPROGRAMS\OpenFlux\Uninstall OpenFlux.lnk"
  RMDir "$SMPROGRAMS\OpenFlux"

  Delete "$INSTDIR\Uninstall OpenFlux.exe"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "${REG_KEY}"
SectionEnd
