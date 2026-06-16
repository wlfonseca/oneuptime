-- outbound_gather.lua: Play message, gather DTMF, notify app
-- Called as: lua outbound_gather.lua main_audio gather_audio num_digits timeout_seconds callback_url
-- In FreeSwitch, args come via the global 'argv' table

local main_audio = argv[1] or ""
local gather_audio = argv[2] or ""
local num_digits = tonumber(argv[3]) or 1
local timeout_sec = tonumber(argv[4]) or 10
local callback_url = argv[5] or ""

-- Answer
session:answer()
session:sleep(500)

-- Play main message
if main_audio ~= "" then
  session:streamFile(main_audio)
else
  session:execute("speak", "flite|slt|Voce tem uma nova notificacao do OneUptime")
end

session:sleep(500)

-- Gather DTMF
local digits = ""
if gather_audio ~= "" then
  session:execute("play_and_get_digits",
    string.format("%d %d 3 %d # %s silence_stream://250 input_digit %d \\d+",
      num_digits, num_digits, timeout_sec * 1000, gather_audio, timeout_sec * 1000))
  digits = session:getVariable("input_digit") or ""
end

freeswitch.consoleLog("INFO", "[outbound_gather] Digits: " .. digits .. "\n")

-- Notify app callback if we got input
if digits ~= "" and callback_url ~= "" then
  local post_data = "Digits=" .. digits
  local cmd = string.format('wget -qO- --post-data "%s" "%s" 2>/dev/null', post_data, callback_url)
  freeswitch.consoleLog("INFO", "[outbound_gather] Callback: " .. callback_url .. "\n")
  local handle = io.popen(cmd)
  if handle then
    handle:read("*a")
    handle:close()
  end
  -- Confirmation in Portuguese
  session:execute("speak", "flite|slt|Reconhecido. Ate logo.")
else
  session:execute("speak", "flite|slt|Nenhuma entrada. Ate logo.")
end

session:sleep(1000)
session:hangup()
