-- Optical capture zones and editor. Leaves game action bars unchanged.
local starts = { 1, 61, 49, 25, 37, 145, 157, 169 }
local prefixes = { "ActionButton", "MultiBarBottomLeftButton", "MultiBarBottomRightButton", "MultiBarRightButton", "MultiBarLeftButton", "MultiBar5Button", "MultiBar6Button", "MultiBar7Button" }
local barNames = { "MainActionBar", "MultiBarBottomLeft", "MultiBarBottomRight", "MultiBarRight", "MultiBarLeft", "MultiBar5", "MultiBar6", "MultiBar7" }
local markers, zones = {}, {}
local config, window, minimapButton
local editing, selected = false, 1
local geometryVersion, iconsDirty, nextSweep = 0, true, 0
local lastActive, activeContext = nil, nil
local RefreshControls, LayoutZones
local function Encode(texture, value)
  texture:SetColorTexture(math.floor(value / 65536) / 255,
    (math.floor(value / 256) % 256) / 255, (value % 256) / 255, 1)
end
local function Settings()
  DeckBridgeDevDB = DeckBridgeDevDB or {}
  DeckBridgeDevDB.liveIcons = DeckBridgeDevDB.liveIcons or {}
  config = DeckBridgeDevDB.liveIcons
  config.size = math.max(1, math.min(4, tonumber(config.size) or 2))
  config.angle = tonumber(config.angle) or 220
  config.zones = config.zones or {}
  for i = 1, 8 do
    local z = config.zones[i] or {}
    config.zones[i] = z
    z.source = math.max(1, math.min(8, math.floor(tonumber(z.source) or i)))
    if z.enabled == nil then z.enabled = not (config.bars and config.bars[i] == false) end
    if z.attached == nil then z.attached = true end
    z.x, z.y = tonumber(z.x) or 100, tonumber(z.y) or (60 + i * 48)
    z.width, z.height = math.max(20, tonumber(z.width) or 480), math.max(20, tonumber(z.height) or 40)
  end
end
local function HideMarkers()
  for _, marker in pairs(markers) do marker:Hide() end
end
local function SaveGeometry(index)
  local frame, z = zones[index], config.zones[index]
  frame:StopMovingOrSizing()
  frame.adjusting = false
  z.attached = false
  z.x, z.y = frame:GetLeft() or z.x, frame:GetBottom() or z.y
  z.width, z.height = frame:GetWidth(), frame:GetHeight()
  LayoutZones()
  RefreshControls()
end
local function Detach(index)
  local frame, z = zones[index], config.zones[index]
  if z.attached then
    z.x, z.y = frame:GetLeft() or z.x, frame:GetBottom() or z.y
    z.width, z.height = math.max(20, frame:GetWidth()), math.max(20, frame:GetHeight())
    z.attached = false
    LayoutZones()
  end
end
LayoutZones = function()
  geometryVersion = geometryVersion + 1
  if not config then return end
  for i = 1, 8 do
    local index, z = i, config.zones[i]
    local zone = zones[i]
    if not zone then
      zone = CreateFrame("Frame", nil, UIParent, "BackdropTemplate")
      zone:SetFrameStrata("HIGH")
      zone:SetMovable(true)
      zone:SetResizable(true)
      zone:SetResizeBounds(20, 20, 2400, 1600)
      zone:SetClampedToScreen(true)
      zone:SetBackdrop({ bgFile = "Interface\\Buttons\\WHITE8X8", edgeFile = "Interface\\Buttons\\WHITE8X8", edgeSize = 2 })
      zone.label = zone:CreateFontString(nil, "OVERLAY", "GameFontNormal")
      zone.label:SetPoint("CENTER")
      zone:RegisterForDrag("LeftButton")
      zone:SetScript("OnMouseDown", function()
        selected = index
        RefreshControls()
        LayoutZones()
      end)
      zone:SetScript("OnDragStart", function(self)
        if not editing or InCombatLockdown() then return end
        Detach(index)
        self.adjusting = true
        self:StartMoving()
      end)
      zone:SetScript("OnDragStop", function() SaveGeometry(index) end)
      zone.grip = CreateFrame("Button", nil, zone)
      zone.grip:SetSize(18, 18)
      zone.grip:SetPoint("BOTTOMRIGHT")
      zone.grip:SetNormalTexture("Interface\\ChatFrame\\UI-ChatIM-SizeGrabber-Up")
      zone.grip:SetScript("OnMouseDown", function()
        if not editing or InCombatLockdown() then return end
        selected = index
        Detach(index)
        zone.adjusting = true
        zone:StartSizing("BOTTOMRIGHT")
      end)
      zone.grip:SetScript("OnMouseUp", function() SaveGeometry(index) end)
      zones[i] = zone
    end
    local source = _G[barNames[z.source]] or (z.source == 1 and _G.MainMenuBar)
    zone:ClearAllPoints()
    if z.attached and source then zone:SetAllPoints(source)
    else zone:SetPoint("BOTTOMLEFT", UIParent, "BOTTOMLEFT", z.x, z.y); zone:SetSize(z.width, z.height) end
    zone:SetBackdropColor(0.05, 0.3, 0.5, i == selected and 0.35 or 0.12)
    if i == selected then zone:SetBackdropBorderColor(1, 0.7, 0.1, 1)
    else zone:SetBackdropBorderColor(0.1, 0.7, 1, 0.6) end
    zone.label:SetText("Zone " .. i .. " - Action Bar " .. z.source)
    zone:SetShown(editing and (z.enabled or i == selected))
    zone:EnableMouse(editing)
    zone.grip:SetShown(editing and i == selected)
  end
end
local function ContextId(active)
  local hash = 5381
  for i = 1, #active do hash = (hash * 33 + string.byte(active, i)) % 16777216 end
  return hash == 0 and 1 or hash
end
local function Update()
  if not config then return end
  local active = DeckBridgeDevDB and DeckBridgeDevDB.active
  if type(active) ~= "string" or active == "" then HideMarkers(); return end
  if active ~= lastActive then lastActive, activeContext = active, ContextId(active); iconsDirty = true end
  local now = GetTime()
  local refreshIcons = iconsDirty or now >= nextSweep
  if refreshIcons then iconsDirty, nextSweep = false, now + 2 end
  local physicalWidth = GetPhysicalScreenSize()
  local pixelScale = UIParent:GetWidth() / physicalWidth
  local profile = DeckBridgeDevDB.profiles and DeckBridgeDevDB.profiles[active]
  for i = 1, 96 do
    local zoneIndex, position = math.floor((i - 1) / 12) + 1, (i - 1) % 12 + 1
    local z, zone = config.zones[zoneIndex], zones[zoneIndex]
    local sourceBar = _G[barNames[z.source]] or (z.source == 1 and _G.MainMenuBar)
    local button = sourceBar and sourceBar.actionButtons and sourceBar.actionButtons[position]
      or _G[prefixes[z.source] .. position]
    local marker = markers[i]
    local visible = z.enabled and (not z.attached or (button and button:IsVisible()))
    if not visible then
      if marker and marker:IsShown() then marker:Hide() end
    else
      if not marker then
        marker = CreateFrame("Frame", nil, UIParent)
        marker:Hide()
        marker:SetFrameStrata("TOOLTIP")
        marker:EnableMouse(false)
        marker.cells = {}
        for j = 1, 6 do marker.cells[j] = marker:CreateTexture(nil, "OVERLAY") end
        Encode(marker.cells[1], 16711935)
        Encode(marker.cells[2], 65535)
        Encode(marker.cells[3], 14352384 + i)
        markers[i] = marker
      end
      local actionSlot = starts[z.source] + position - 1
      local icon = marker.lastIcon
      if refreshIcons or marker.actionSlot ~= actionSlot or icon == nil then
        if C_ActionBar and C_ActionBar.GetActionTexture then icon = C_ActionBar.GetActionTexture(actionSlot)
        else icon = GetActionTexture(actionSlot) end
      end
      if issecretvalue and issecretvalue(icon) then
        marker:Hide(); marker.lastIcon = nil
      else
        icon = icon or 0
        if type(icon) == "number" and icon >= 0 and icon <= 16777215 and icon == math.floor(icon) then
          local width, height = zone:GetWidth(), zone:GetHeight()
          if marker.version ~= geometryVersion or marker.pixelScale ~= pixelScale or marker.cellSize ~= config.size
            or marker.button ~= button or (not z.attached and (marker.width ~= width or marker.height ~= height)) then
            marker:SetScale(pixelScale)
            marker:ClearAllPoints()
            if z.attached then marker:SetPoint("TOPLEFT", button, "TOPLEFT", 4, -4)
            else
              local ratio = 1 / pixelScale
              local x = z.vertical and 4 or ((position - 1) * width / 12 + 4) * ratio
              local y = z.vertical and ((position - 1) * height / 12 + 4) * ratio or 4
              marker:SetPoint("TOPLEFT", zone, "TOPLEFT", x, -y)
            end
            marker:SetSize(config.size * 6, config.size)
            if marker.cellSize ~= config.size then
              for j = 1, 6 do
                local cell = marker.cells[j]
                cell:ClearAllPoints()
                cell:SetPoint("TOPLEFT", marker, "TOPLEFT", (j - 1) * config.size, 0)
                cell:SetSize(config.size, config.size)
              end
            end
            marker.version, marker.pixelScale, marker.cellSize = geometryVersion, pixelScale, config.size
            marker.button, marker.width, marker.height = button, width, height
          end
          if marker.lastIcon ~= icon or marker.context ~= activeContext then
            Encode(marker.cells[4], icon)
            Encode(marker.cells[5], (icon + i + activeContext + 4473347) % 16777216)
            Encode(marker.cells[6], activeContext)
            marker.lastIcon, marker.context = icon, activeContext
          end
          marker.actionSlot = actionSlot
          if not marker:IsShown() then marker:Show() end
          local secureButton = _G["DeckBridgeDevSlot" .. i]
          if secureButton and not InCombatLockdown() and secureButton:GetAttribute("action") ~= actionSlot then
            secureButton:SetAttribute("action", actionSlot)
          end
          if profile then
            local entry = profile[i]
            if not entry or entry.id ~= actionSlot or entry.icon ~= icon then
              profile[i] = { kind = "action", id = actionSlot, icon = icon }
            end
          end
        else marker:Hide(); marker.lastIcon = nil end
      end
    end
  end
end
local function MakeButton(parent, text, x, y, width, click)
  local button = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
  button:SetSize(width, 25)
  button:SetPoint("TOPLEFT", x, y)
  button:SetText(text)
  button:SetScript("OnClick", click)
  return button
end
local function CheckLabel(check, text)
  local label = check.Text or check.text
  if not label then
    label = check:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
    label:SetPoint("LEFT", check, "RIGHT", 0, 0)
  end
  label:SetText(text)
end
RefreshControls = function()
  if not window then return end
  local z = config.zones[selected]
  for i, button in ipairs(window.zoneButtons) do button:SetEnabled(i ~= selected) end
  window.status:SetText("Selected zone: " .. selected)
  window.enabled:SetChecked(z.enabled)
  window.attached:SetChecked(z.attached)
  window.source:SetText("Source: Action Bar " .. z.source .. "  >")
  window.size:SetText("Marker size: " .. config.size .. " px  >")
  window.dimensions:SetText(math.floor(zones[selected]:GetWidth()) .. " x " .. math.floor(zones[selected]:GetHeight()))
end
local function OpenSettings()
  if InCombatLockdown() then print("DeckBridge: Zone settings are unavailable during combat."); return end
  if not config then Settings() end
  if window and window:IsShown() then window:Hide(); return end
  if not window then
    window = CreateFrame("Frame", "DeckBridgeDevLiveSettings", UIParent, "BasicFrameTemplateWithInset")
    window:SetSize(420, 410)
    window:SetPoint("CENTER")
    window:SetFrameStrata("DIALOG")
    window:SetMovable(true)
    window:EnableMouse(true)
    window:RegisterForDrag("LeftButton")
    window:SetScript("OnDragStart", window.StartMoving)
    window:SetScript("OnDragStop", window.StopMovingOrSizing)
    window.TitleText:SetText("DeckBridge - Zone Settings")
    window:SetScript("OnHide", function()
      editing = false
      for i, zone in ipairs(zones) do
        if zone.adjusting then SaveGeometry(i) end
      end
      LayoutZones()
    end)
    window.zoneButtons = {}
    for i = 1, 8 do
      local index = i
      window.zoneButtons[i] = MakeButton(window, tostring(i), 18 + (i - 1) * 48, -40, 44, function()
        selected = index; LayoutZones(); RefreshControls()
      end)
    end
    window.status = window:CreateFontString(nil, "OVERLAY", "GameFontNormal")
    window.status:SetPoint("TOPLEFT", 20, -80)
    window.enabled = CreateFrame("CheckButton", nil, window, "UICheckButtonTemplate")
    window.enabled:SetPoint("TOPLEFT", 16, -101)
    CheckLabel(window.enabled, "Enable zone")
    window.enabled:SetScript("OnClick", function(self) config.zones[selected].enabled = self:GetChecked() and true or false; HideMarkers(); LayoutZones() end)
    window.attached = CreateFrame("CheckButton", nil, window, "UICheckButtonTemplate")
    window.attached:SetPoint("TOPLEFT", 16, -131)
    CheckLabel(window.attached, "Snap to action bar")
    window.attached:SetScript("OnClick", function(self)
      if self:GetChecked() then config.zones[selected].attached = true else Detach(selected) end
      LayoutZones(); RefreshControls()
    end)
    window.source = MakeButton(window, "", 20, -169, 240, function()
      local z = config.zones[selected]
      z.source = z.source % 8 + 1
      LayoutZones(); HideMarkers(); RefreshControls()
    end)
    MakeButton(window, "Rotate 90 degrees", 20, -203, 180, function()
      Detach(selected)
      local z = config.zones[selected]
      z.vertical = not z.vertical
      z.width, z.height = math.max(20, z.height), math.max(20, z.width)
      LayoutZones(); RefreshControls()
    end)
    window.size = MakeButton(window, "", 215, -203, 180, function()
      config.size = config.size % 4 + 1; RefreshControls()
    end)
    window.dimensions = window:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    window.dimensions:SetPoint("TOPLEFT", 20, -245)
    local help = window:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
    help:SetPoint("TOPLEFT", 20, -270)
    help:SetWidth(375)
    help:SetJustifyH("LEFT")
    help:SetText("Select a zone or its number. Drag to detach it from the action bar. Drag the bottom-right handle to resize.\n\nOutlines and handles disappear when you close this window. Only the small icon markers remain visible.")
    MakeButton(window, "Done", 80, -367, 260, function() window:Hide() end)
    local website = CreateFrame("Button", nil, window)
    website:SetSize(24, 24)
    website:SetPoint("BOTTOMRIGHT", window, "BOTTOMRIGHT", -14, 17)
    website:SetNormalTexture("Interface\\AddOns\\DeckBridgeDev\\Textures\\Duotone\\website")
    website:SetHighlightTexture("Interface\\Buttons\\UI-Common-MouseHilight", "ADD")
    website:SetScript("OnEnter", function(self)
      GameTooltip:SetOwner(self, "ANCHOR_TOP")
      GameTooltip:AddLine("citru5kick.pl")
      GameTooltip:AddLine("Click to copy the website address", 1, 1, 1)
      GameTooltip:Show()
    end)
    website:SetScript("OnLeave", function() GameTooltip:Hide() end)
    website:SetScript("OnClick", function()
      GameTooltip:Hide()
      if not window.websiteDialog then
        local dialog = CreateFrame("Frame", "DeckBridgeDevWebsiteDialog", window, "BasicFrameTemplateWithInset")
        dialog:SetSize(350, 140)
        dialog:SetPoint("CENTER", window, "CENTER")
        dialog:SetFrameStrata("TOOLTIP")
        dialog:EnableMouse(true)
        dialog.TitleText:SetText("DeckBridge Website")
        local description = dialog:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
        description:SetPoint("TOP", 0, -37)
        description:SetText("Press Ctrl+C, then paste into your browser.")
        local address = CreateFrame("EditBox", nil, dialog, "InputBoxTemplate")
        address:SetSize(295, 24)
        address:SetPoint("TOP", 0, -61)
        address:SetAutoFocus(false)
        address:SetMaxLetters(128)
        address:SetScript("OnEscapePressed", function() dialog:Hide() end)
        address:SetScript("OnEnterPressed", function() dialog:Hide() end)
        address:SetScript("OnEditFocusGained", function(self) self:HighlightText() end)
        address:SetScript("OnTextChanged", function(self)
          if self:GetText() ~= "https://citru5kick.pl" then self:SetText("https://citru5kick.pl"); self:HighlightText() end
        end)
        dialog:SetScript("OnHide", function() address:ClearFocus() end)
        MakeButton(dialog, "Close", 125, -101, 100, function() dialog:Hide() end)
        window:HookScript("OnHide", function() dialog:Hide() end)
        window.websiteDialog, window.websiteAddress = dialog, address
        table.insert(UISpecialFrames, "DeckBridgeDevWebsiteDialog")
      end
      window.websiteDialog:Show()
      window.websiteAddress:SetText("https://citru5kick.pl")
      window.websiteAddress:SetFocus()
      window.websiteAddress:HighlightText()
    end)
    table.insert(UISpecialFrames, "DeckBridgeDevLiveSettings")
  end
  editing = true
  LayoutZones(); RefreshControls(); window:Show()
end
local function PositionMinimap()
  local angle = math.rad(config.angle)
  local radius = Minimap:GetWidth() / 2 + 12
  minimapButton:ClearAllPoints()
  minimapButton:SetPoint("CENTER", Minimap, "CENTER", math.cos(angle) * radius, math.sin(angle) * radius)
end
local function CreateMinimapButton()
  minimapButton = CreateFrame("Button", "DeckBridgeDevMinimapButton", Minimap)
  minimapButton:SetSize(28, 28)
  minimapButton:SetFrameStrata("MEDIUM")
  minimapButton:SetNormalTexture("Interface\\AddOns\\DeckBridgeDev\\Textures\\Duotone\\brand")
  minimapButton:SetHighlightTexture("Interface\\Minimap\\UI-Minimap-ZoomButton-Highlight")
  minimapButton:RegisterForClicks("LeftButtonUp")
  minimapButton:RegisterForDrag("LeftButton")
  minimapButton:SetScript("OnClick", function(self)
    if not self.lastDrag or GetTime() - self.lastDrag > 0.2 then OpenSettings() end
  end)
  minimapButton:SetScript("OnDragStart", function(self)
    self:SetScript("OnUpdate", function()
      local x, y = GetCursorPosition()
      local scale = Minimap:GetEffectiveScale()
      local cx, cy = Minimap:GetCenter()
      config.angle = math.deg(math.atan2(y / scale - cy, x / scale - cx))
      PositionMinimap()
    end)
  end)
  minimapButton:SetScript("OnDragStop", function(self)
    self.lastDrag = GetTime()
    self:SetScript("OnUpdate", nil)
  end)
  minimapButton:SetScript("OnEnter", function(self)
    GameTooltip:SetOwner(self, "ANCHOR_LEFT")
    GameTooltip:AddLine("DeckBridge")
    GameTooltip:AddLine("Click to open zone settings", 1, 1, 1)
    GameTooltip:AddLine("Drag to reposition around the minimap", 1, 1, 1)
    GameTooltip:Show()
  end)
  minimapButton:SetScript("OnLeave", function() GameTooltip:Hide() end)
  PositionMinimap()
end
SLASH_DECKBRIDGEDEVLIVE1 = "/dbzones"
SLASH_DECKBRIDGEDEVLIVE2 = "/dbdevlive"
SlashCmdList["DECKBRIDGEDEVLIVE"] = OpenSettings
local controller = CreateFrame("Frame")
controller:RegisterEvent("PLAYER_LOGIN")
controller:RegisterEvent("ACTIONBAR_SLOT_CHANGED")
controller:RegisterEvent("PLAYER_ENTERING_WORLD")
controller:RegisterEvent("PLAYER_SPECIALIZATION_CHANGED")
controller:RegisterEvent("PLAYER_REGEN_ENABLED")
controller:RegisterEvent("UPDATE_SHAPESHIFT_FORM")
controller:RegisterEvent("PLAYER_REGEN_DISABLED")
controller:RegisterEvent("UI_SCALE_CHANGED")
controller:RegisterEvent("DISPLAY_SIZE_CHANGED")
controller:SetScript("OnEvent", function(_, event)
  if event == "PLAYER_LOGIN" then Settings(); LayoutZones(); CreateMinimapButton()
  elseif event == "PLAYER_REGEN_DISABLED" then if window then window:Hide() end
  elseif event == "UI_SCALE_CHANGED" or event == "DISPLAY_SIZE_CHANGED" then
    if config then LayoutZones(); PositionMinimap() end
  else iconsDirty = true end
end)
local elapsed = 0
local lastError = -math.huge
controller:SetScript("OnUpdate", function(_, delta)
  elapsed = elapsed + delta
  if elapsed < 0.25 then return end
  elapsed = 0
  local ok, problem = pcall(Update)
  if not ok then
    iconsDirty = true
    HideMarkers()
    if GetTime() - lastError > 10 then
      lastError = GetTime()
      print("DeckBridge: Unable to update icon markers: " .. tostring(problem))
    end
  end
end)
