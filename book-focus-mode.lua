-- Focus Mode for Quarto Book
-- Injects a floating focus-mode button into Quarto Book HTML output.

function Meta(meta)
  -- Only inject into HTML outputs
  if not quarto.doc.is_format("html") then
    return meta
  end

  -- Resolve the directory where this Lua filter is located
  local source = debug.getinfo(1, "S").source
  if source:sub(1, 1) == "@" then
    source = source:sub(2)
  end

  local dir = pandoc.path.directory(source)
  local html_path = pandoc.path.join({dir, "focus-mode.html"})

  local html_file = io.open(html_path, "r")
  if html_file == nil then
    quarto.log.warning("focus-mode.html not found; Quarto Book Focus Mode was not injected.")
    return meta
  end

  local html = html_file:read("*all")
  html_file:close()

  quarto.doc.include_text("after-body", html)

  return meta
end
