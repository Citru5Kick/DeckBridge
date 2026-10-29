-- Independent utility bindings. No macros, arbitrary chat text or SavedVariables writes.
local owner = CreateFrame("Frame")
local emotes = { "WAVE", "DANCE", "CHEER", "APPLAUD", "BOW", "SALUTE", "LAUGH", "THANK", "HELLO", "BYE", "POINT", "SHRUG" }
local buttons = {}
for i, token in ipairs(emotes) do
  local emote = token
  local button = CreateFrame("Button", "DeckBridgeDevEmote" .. i, UIParent)
  button:SetSize(1, 1)
  button:SetAlpha(0)
  button:EnableMouse(false)
  button:RegisterForClicks("AnyUp")
  button:SetScript("OnClick", function()
    -- Same fixed-token API used by Blizzard's emote menu. No text is pasted into chat.
    if C_ChatInfo and C_ChatInfo.PerformEmote then
      local ok = C_ChatInfo.PerformEmote(emote)
      if ok == false then print("DeckBridge: This emote is currently unavailable.") end
    end
  end)
  buttons[i] = button
end
local function Key(index)
  return "ALT-CTRL-SHIFT-" .. string.char(65 + index)
end
local pending = false
local expectedBindings = {}
local function CheckBindings(verbose)
  local count, total = 0, 0
  for key, expected in pairs(expectedBindings) do
    total = total + 1
    local actual = GetBindingAction(key, true)
    if actual == expected then count = count + 1
    elseif verbose then print("DeckBridge: " .. key .. " is not registered (" .. tostring(actual) .. ").") end
  end
  return count, total
end
local function Apply()
  if InCombatLockdown() then pending = true; return end
  pending = false
  ClearOverrideBindings(owner)
  expectedBindings = {}
  local panels = { [0] = "TOGGLEQUESTLOG", [1] = "TOGGLEBACKPACK", [14] = "TOGGLEQUESTLOG", [15] = "TOGGLECHARACTER0", [16] = "TOGGLESPELLBOOK" }
  for index, command in pairs(panels) do
    local key = Key(index)
    expectedBindings[key] = command
    pcall(SetOverrideBinding, owner, false, key, command)
  end
  for i, button in ipairs(buttons) do
    local key = Key(i + 1)
    expectedBindings[key] = "CLICK " .. button:GetName() .. ":LeftButton"
    pcall(SetOverrideBindingClick, owner, false, key, button:GetName(), "LeftButton")
  end
  local count, total = CheckBindings(false)
  if count ~= total then
    print("DeckBridge: Some utility shortcuts could not be registered. Use /dbcheck for details.")
  end
end
SLASH_DECKBRIDGEDEVUTILITYCHECK1 = "/dbcheck"
SlashCmdList["DECKBRIDGEDEVUTILITYCHECK"] = function()
  if not InCombatLockdown() then Apply() end
  local count, total = CheckBindings(true)
  print("DeckBridge: Utility shortcuts registered: " .. count .. "/" .. total .. ".")
  if pending then print("DeckBridge: Binding update is waiting for combat to end.") end
end
owner:RegisterEvent("PLAYER_LOGIN")
owner:RegisterEvent("UPDATE_BINDINGS")
owner:RegisterEvent("PLAYER_REGEN_ENABLED")
owner:SetScript("OnEvent", function(_, event)
  if event ~= "PLAYER_REGEN_ENABLED" or pending then Apply() end
end)
