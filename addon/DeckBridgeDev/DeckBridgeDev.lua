local NUM_SLOTS = 96
local AUTO_SLOTS = 96

-- Pierwsze sloty poszczególnych pasków WoW.
-- Kolejność odpowiada ustawieniom DeckBridge.
local BAR_STARTS = {
  1,    -- Pasek 1
  61,   -- Pasek 2
  49,   -- Pasek 3
  25,   -- Pasek 4
  37,   -- Pasek 5
  145,  -- Pasek 6
  157,  -- Pasek 7
  169,  -- Pasek 8
}

local function WoWActionSlot(deckSlot)
  local bar = math.floor((deckSlot - 1) / 12) + 1
  local position = ((deckSlot - 1) % 12) + 1
  return BAR_STARTS[bar] + position - 1
end
local MODS = { "", "ALT-", "CTRL-", "SHIFT-", "ALT-CTRL-", "ALT-SHIFT-", "CTRL-SHIFT-", "ALT-CTRL-SHIFT-" }

local owner = CreateFrame("Frame")
local slots = {}
local pending = false

local function SlotKey(i)
  return MODS[math.floor((i - 1) / 12) + 1] .. "F" .. (1 + (i - 1) % 12)
end

for i = 1, NUM_SLOTS do
  local b = CreateFrame("Button", "DeckBridgeDevSlot" .. i, UIParent, "SecureActionButtonTemplate")
  b:RegisterForClicks("AnyDown", "AnyUp")
  slots[i] = b
end

local function ProfileKey()
  local specIndex = GetSpecialization()
  local spec = specIndex and GetSpecializationInfo(specIndex) or 0
  return UnitName("player") .. "-" .. GetRealmName() .. "-" .. spec
end

local function EnsureProfile()
  DeckBridgeDevDB = DeckBridgeDevDB or {}
  DeckBridgeDevDB.profiles = DeckBridgeDevDB.profiles or {}
  local key = ProfileKey()
  DeckBridgeDevDB.active = key
  DeckBridgeDevDB.profiles[key] = DeckBridgeDevDB.profiles[key] or {}
  return DeckBridgeDevDB.profiles[key]
end

-- The first twelve entries mirror action slots 1..12, including empty slots.
-- SavedVariables are written to disk by WoW at logout/reload, not on every change.
local function CaptureActionBar()
  local prof = EnsureProfile()

  for i = 1, AUTO_SLOTS do
    local actionSlot = WoWActionSlot(i)
    local icon = GetActionTexture(actionSlot)

    prof[i] = {
      kind = "action",
      id = actionSlot,
      icon = icon or 0
    }
  end
end

local function Apply()
  if InCombatLockdown() then pending = true return end
  pending = false
  ClearOverrideBindings(owner)
  local prof = EnsureProfile()
  for i, b in ipairs(slots) do
    b:SetAttribute("type", nil)
    if i <= AUTO_SLOTS then
		b:SetAttribute("type", "action")
		b:SetAttribute("action", WoWActionSlot(i))
		SetOverrideBindingClick(owner, false, SlotKey(i), b:GetName(), "LeftButton")
	end
  end
end



local f = CreateFrame("Frame")
f:RegisterEvent("PLAYER_LOGIN")
f:RegisterEvent("PLAYER_ENTERING_WORLD")
f:RegisterEvent("PLAYER_SPECIALIZATION_CHANGED")
f:RegisterEvent("PLAYER_REGEN_ENABLED")
f:RegisterEvent("ACTIONBAR_SLOT_CHANGED")
f:SetScript("OnEvent", function(_, event)
  if event == "PLAYER_LOGIN" or event == "PLAYER_ENTERING_WORLD" or event == "PLAYER_SPECIALIZATION_CHANGED" then
    CaptureActionBar()
    Apply()
  elseif event == "ACTIONBAR_SLOT_CHANGED" then
    CaptureActionBar()
    -- Action attributes point to slots, not spells: changing a slot requires no rebind.
  elseif event == "PLAYER_REGEN_ENABLED" and pending then
    Apply()
  end
end)
