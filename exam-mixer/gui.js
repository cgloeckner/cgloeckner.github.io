/// Save all selected files to the localStorage using the selected prefix
function upload() {
    const file_input = $('#file_input')[0].files
    const prefix = $('#prefix')[0].value
    let files_processed = 0

    for (let file of file_input) {
        const reader = new FileReader()
        reader.onload = function(event) {
            content = event.target.result
            content = content.split('\\begin{document}')[1].split('\\end{document')[0].trim()
            const key = prefix + file.name
            localStorage.setItem(key, content)
            console.log(`Saved: ${key}`)

            files_processed += 1
            if (files_processed === file_input.length) {
                show_all_files()
            }
        }
        reader.readAsText(file)
    }
}

/// Return a list of all available files, keyed by prefix
function list_all_files() {
    const data = []

    for (let i = 0; i < localStorage.length; ++i) {
        const full_key = localStorage.key(i)
        const split_index = full_key.indexOf(':')
        if (split_index === -1) {
            continue
        }
        if (!full_key.endsWith('.tex')) {
            continue
        }

        const prefix = full_key.substring(0, split_index)
        const filename = full_key.substring(split_index + 1)

        if (!data[prefix]) {
            data[prefix] = []
        }
        data[prefix].push(filename)
    }

    return data
}

/// Load a file of specific prefix and return the file content
function load_file(prefix, filename) {
    full_key = `${prefix}:${filename}`
    return localStorage.getItem(full_key)
}

/// Delete a file of specific prefix
function delete_file(prefix, filename) {
    full_key = `${prefix}:${filename}`
    localStorage.removeItem(full_key)
    show_all_files()
}

/// List all available TeX files in the GUI
function show_all_files() {
    const all_files = list_all_files()

    for (const prefix of ['presentation', 'interview']) {
        const parent = $(`div#all_${prefix}`)
        const prefixed_files = all_files[prefix]

        parent.empty()
        if (!prefixed_files) {
            continue
        }
        for (const filename of prefixed_files) {
            const paragraph = $('<p></p>')
            const span = $('<span></span>').text(filename)
            const btn = $('<button></button>').text('X').on('click', function() {
                delete_file(prefix, filename)
            })
            paragraph.append(span, btn)

            parent.append(paragraph)
        }
    }
}

/// Create a new select option from the given data with a certain default value
function create_select(data, default_value) {
    let select = $('<select></select>')
    for (const value of data) {
        let option = $('<option></option>').val(value).text(value)
        if (value === default_value) {
            option.attr('selected', 'selected')
        }
        select.append(option)
    }
    return select
}

/// Add a new row to the Mix GUI with optional default values
function add_row(value1 = null, value2 = null) {
    const all_files = list_all_files()
    row = $('<tr>')

    select1 = create_select(all_files['presentation'], value1)
    select1.on('change', function() {save_mixes()})
    presentation_cell = $('<td>').append(select1)

    select2 = create_select(all_files['interview'], value2)
    select2.on('change', function() {save_mixes()})
    interview_cell = $('<td>').append(select2)
    clear_button = $('<button>').text('X').on('click', function() {
        $(this).closest('tr').remove()
    })
    
    row.append(presentation_cell, interview_cell, clear_button)
    
    $('#mixes tbody').append(row)

    save_mixes()
}

/// Get the selection of all mix configurations
function get_mix_selections() {
    rows = $('#mixes tr')
    data = []

    for (const row of rows) {
        const selects = row.querySelectorAll('select')
        if (selects.length !== 2) {
            continue
        }
        const first = selects[0].value
        const second = selects[1].value

        data.push([first, second])
    }

    return data
}

/// Save all mix configurations to localStorage
function save_mixes() {
    const mixes = get_mix_selections()
    const dumped = JSON.stringify(mixes)
    localStorage.setItem('all_mixes', dumped)
}

/// Load all mix configurations from localStorage
function load_mixes() {
    const all_mixes = localStorage.getItem('all_mixes')
    const data = JSON.parse(all_mixes)
    if (data === null) {
        return {}
    }
    return data
}

/// Update the Mixes in GUI
function show_mixes() {
    // clear all
    rows = $('#mixes tr')

    for (const row of rows) {
        const selects = row.querySelectorAll('select')
        if (selects.length !== 2) {
            continue
        }
        row.remove()
    }

    // recreate rows
    all_mixes = load_mixes()
    for (const mix of all_mixes) {
        add_row(mix[0], mix[1])
    }
}

/// Prepare and returns all texts: load and split them
function prepare_all_texts(all_files) {
    const data = []
    for (const prefix of ['presentation', 'interview']) {
        data[prefix] = {}
        filelist = all_files[prefix]
        for (const filename of filelist) {
            content = load_file(prefix, filename)
            parts = content.split('\\clearpage')
            data[prefix][filename] = [parts[0].trim(), parts[1].trim()]
        }
    }
    return data
}

/// Provide string as downloadable file
function as_download(content) {
    const now = new Date()
    const prefix = now.toISOString().slice(0, 9)
    const filename = `${prefix}.tex`

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/// Upload preamble
function upload_preamble() {
    const file = $('#preamble_input')[0].files[0]
    const reader = new FileReader()
    reader.onload = function(event) {
        content = event.target.result
        content = content.split('\\begin{document}')[0]
        localStorage.setItem('preamble', content)
        $('#preamble').val(content)
    }
    reader.readAsText(file)
}

/// Save preamble
function save_preamble() {
    const content = $('#preamble').val()
    localStorage.setItem('preamble', content)
}

/// Show preamble in GUI
function show_preamble() {
    const content = localStorage.getItem('preamble')
    if (content !== null) {
        $('#preamble').val(content)
    }
}

/// Compile the mix to a single tex file
function compile() {
    const all_files = list_all_files()
    const prepared = prepare_all_texts(all_files)

    const preamble = $('#preamble').val()
    doc = preamble + "\n\\begin{document}\n"
    let task_number = 1

    const data = get_mix_selections()
    for (const mix of data) {
        // load TeX from storage
        const p = prepared['presentation'][mix[0]]
        const i = prepared['interview'][mix[1]]
        
        const text1 = `\\section*{Thema ${task_number}}\n`
            + '\\subsection*{Teil 1}\n'
            + p[0] + "\n"

        const text2 = `\\section*{Thema ${task_number}}\n`
            + '\\subsection*{Teil 2}\n'
            + i[0] + "\n"

        const expect = `\\section*{Erwartungsbild Thema ${task_number}}\n`
            + p[1] + "\n" + i[1] + "\n"

        doc += text1 + '\\clearpage' + text1 + '\\vfill' + text2 + '\\clearpage' + expect + '\\cleardoublepage'
        task_number += 1
    }
    doc += "\n\\end{document}"

    as_download(doc)
}

show_preamble()
show_all_files()
show_mixes()
