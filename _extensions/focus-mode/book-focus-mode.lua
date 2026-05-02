function Meta(meta)
  if not quarto.doc.is_format("html") then
    return meta
  end

  local source = debug.getinfo(1, "S").source
  if source:sub(1, 1) == "@" then
    source = source:sub(2)
  end
  local dir = pandoc.path.directory(source)

  quarto.doc.add_html_dependency({
    name = "focus-mode",
    version = "1.0.0",
    stylesheets = { pandoc.path.join({ dir, "focus-mode.css" }) },
    scripts    = { pandoc.path.join({ dir, "focus-mode.js"  }) },
  })

  local html_path = pandoc.path.join({ dir, "focus-mode.html" })
  local html_file = io.open(html_path, "r")
  if html_file == nil then
    quarto.log.warning("focus-mode.html not found; Focus Mode was not injected.")
    return meta
  end

  local html = html_file:read("*all")
  html_file:close()
  quarto.doc.include_text("after-body", html)

  return meta
end
