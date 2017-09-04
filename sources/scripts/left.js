function Left() {
  this.navi_el        = document.createElement('navi'); 
  this.textarea_el    = document.createElement('textarea'); 
  this.stats_el       = document.createElement('stats');

  this.dictionary = new Dict();

  this.words_count = null;
  this.lines_count = null;
  this.chars_count = null;  
  this.current_word = null;
  this.suggestion = null;

  document.body.appendChild(this.navi_el);
  document.body.appendChild(this.textarea_el);
  document.body.appendChild(this.stats_el);
  document.body.className = window.location.hash.replace("#","");

  this.textarea_el.setAttribute("autocomplete", "off");
  this.textarea_el.setAttribute("autocorrect", "off");
  this.textarea_el.setAttribute("autocapitalize", "off");
  this.textarea_el.setAttribute("spellcheck", "false");
  this.textarea_el.setAttribute("type", "text");

  var left = this;

  window.addEventListener('dragover', function(e)
  { 
    e.stopPropagation(); 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'copy'; 
  });
  
  window.addEventListener('drop', function(e)
  {
    e.stopPropagation();
    e.preventDefault();
  
    var files = e.dataTransfer.files;
    var file = files[0];
  
    if (!file.type.match(/text.*/)) { console.log("Not image"); return false; }
  
    var reader = new FileReader();
    reader.onload = function(e){
      left.textarea_el.value = e.target.result;
      left.dictionary.update();
      left.refresh();
      left.refresh_settings();
    };
    reader.readAsText(file);
  });
  
  window.onbeforeunload = function(e)
  {
    localStorage.setItem("backup", left.textarea_el.value);
    return 'Trying to close the window';
  };
  
  document.oninput = function on_input(e)
  {
    left.refresh();
  };
  
  document.onmouseup = function on_mouseup(e)
  {
    left.refresh();
  };
  
  document.onkeydown = function key_down(e)
  {
    if (e.key === "s" && e.ctrlKey) {
      e.preventDefault();
      var text = left.textarea_el.value;
      var blob = new Blob([text], { type: "text/plain;charset=" + document.characterSet });
      var d = new Date(), e = new Date(d);
      var since_midnight = e - d.setHours(0,0,0,0);
      var timestamp = parseInt((since_midnight/864) * 10);
      saveAs(blob, "backup." + timestamp + ".txt");
    }
  
    if ((e.key === "Backspace" || e.key === "Delete") && e.ctrlKey && e.shiftKey) {
      e.preventDefault();
      left.textarea_el.value = left.splash();
      localStorage.setItem("backup", left.textarea_el.value);
    }
  
    if (e.keyCode === 9 && left.suggestion) {
      left.autocomplete();
      e.preventDefault();
    }
  
    if (e.key === "Enter" || e.key === " ") {
      left.dictionary.update();
      left.refresh_settings();
    }
  
    if (e.key.substr(0,5) === "Arrow") {
      left.refresh();
    }
  };
}

Left.prototype.start = function() {
  this.textarea_el.focus();

  if (localStorage.backup) {
    this.textarea_el.value = localStorage.backup;
  } else {
    this.textarea_el.value = this.splash();
    this.textarea_el.setSelectionRange(2,9);
  }

  this.dictionary.update();
  this.refresh();
  this.refresh_settings();
};

Left.prototype.refresh = function() {
  left.current_word = left.active_word();
  left.suggestion = left.dictionary.find_suggestion(left.current_word);

  this.refresh_navi();
  this.refresh_stats();
};

Left.prototype.refresh_navi = function() {
  left.navi_el.innerHTML = "";

  var html = "";
  var text = left.textarea_el.value;
  var lines = text.split("\n");
  var markers = [];

  left.lines_count = lines.length;
  left.words_count = text.split(" ").length;
  left.chars_count = text.length;

  for(var line_id in lines){
    var line = lines[line_id];
    if(line.substr(0,2) === "@ " || line.substr(0,2) === "# "){ html += "<li onClick='go_to(\""+line+"\")'>"+line.replace("@ ","").replace("# ","")+"<span>"+line_id+"</span></li>"; markers.push(line); }
    if(line.substr(0,2) === "$ " || line.substr(0,3) === "## "){ html += "<li onClick='go_to(\""+line+"\")' class='note'>"+line.replace("$ ","").replace("## ","")+"<span>"+line_id+"</span></li>"; markers.push(line); }
  }

  if(markers.length === 0){
    html = "No Markers";
  }

  left.navi_el.innerHTML = html;
};

Left.prototype.refresh_stats = function() {
  var stats = {};
  stats.l = left.lines_count;
  stats.w = left.words_count;
  stats.c = left.chars_count;
  stats.v = left.dictionary.vocabulary.length;
  stats.p = (left.textarea_el.selectionEnd/parseFloat(left.chars_count)) * 100; stats.p = stats.p > 100 ? 100 : parseInt(stats.p);

  suggestion_html = (left.current_word && left.suggestion && left.current_word != left.suggestion) ? " <t>"+left.current_word+"<b>"+left.suggestion.substr(left.current_word.length,left.suggestion.length)+"</b></t>" : "";

  // Synonyms
  var synonyms = this.dictionary.find_synonym(left.current_word); synonym_html = "";
  for(syn_id in synonyms){ synonym_html += synonyms[syn_id]+" "; }

  left.stats_el.innerHTML = synonyms ? " <b>"+left.current_word+"</b> "+synonym_html : stats.l+"L "+stats.w+"W "+stats.v+"V "+stats.c+"C "+(stats.p > 0 && stats.p < 100 ? stats.p+"%" : "")+suggestion_html+synonym_html;
};

Left.prototype.refresh_settings = function() {
  if(left.textarea_el.value.indexOf("~ left.theme=") >= 0){
    var theme_name = left.textarea_el.value.split("~ left.theme=")[1].split(" ")[0];
    document.body.className = theme_name;
  }
  if(left.textarea_el.value.indexOf("~ left.suggestions=") >= 0){
    var suggestions_toggle = left.textarea_el.value.split("~ left.suggestions=")[1].split(" ")[0];
    if(suggestions_toggle === "off"){ left.dictionary.is_suggestions_enabled = false; }
    if(suggestions_toggle === "on"){ left.dictionary.is_suggestions_enabled = true; }
  }
  if(left.textarea_el.value.indexOf("~ left.synonyms=") >= 0){
    var synonyms_toggle = left.textarea_el.value.split("~ left.synonyms=")[1].split(" ")[0];
    if(synonyms_toggle === "off"){ left.dictionary.is_synonyms_enabled = false; }
    if(synonyms_toggle === "on"){ left.dictionary.is_synonyms_enabled = true; }
  }
};

Left.prototype.splash = function() {
  return "# Welcome\n\n## Controls\n\n- Create markers by beginning lines with either @ and $, or # and ##.\n- Overline words to look at synonyms.\n- Export a text file with ctrl+s.\n- Import a text file by dragging it on the window.\n- Press <tab> to autocomplete a word.\n- The synonyms dictionary contains "+Object.keys(left.dictionary.synonyms).length+" common words.\n- Automatically keeps backups, press ctrl+shift+del to erase the backups.\n\n## Details\n\n- #L, stands for Lines.\n- #W, stands for Words.\n- #V, stands for Vocabulary, or unique words.\n- #C, stands for Characters.\n\n## Themes & Settings\n\n~ left.theme=blanc     set default theme.\n~ left.theme=noir      set noir theme.\n~ left.theme=pale      set low-contrast theme.\n~ left.suggestions=off disable suggestions\n~ left.synonyms=off    disable synonyms\n\n## Enjoy.\n\n- https://github.com/hundredrabbits/Left";
};

Left.prototype.active_word = function() {
  var before = this.textarea_el.value.substr(0,left.textarea_el.selectionEnd);
  var words = before.replace(/\n/g," ").split(" ");
  var last_word = words[words.length-1];
  return last_word.replace(/\W/g, '');
};

Left.prototype.inject = function(characters = "__") {
  var pos = this.textarea_el.selectionStart;
  var before = this.textarea_el.value.substr(0,pos);
  var middle = characters;
  var after  = this.textarea_el.value.substr(pos,this.textarea_el.value.length);

  this.textarea_el.value = before+middle+after;
  this.textarea_el.setSelectionRange(pos+characters.length,pos+characters.length);
  this.refresh();
};

Left.prototype.autocomplete = function() {
  var suggestion = left.suggestion;
  this.inject(suggestion.substr(left.current_word.length,suggestion.length));
};

Left.prototype.go_to = function(selection) {
  var from = this.textarea_el.value.indexOf(selection);
  var to   = from + selection.length;

  if(this.textarea_el.setSelectionRange){
   this.textarea_el.setSelectionRange(from,to);
  } 
  else if(this.textarea_el.createTextRange){
    var range = this.textarea_el.createTextRange();
    range.collapse(true);
    range.moveEnd('character',to);
    range.moveStart('character',from);
    range.select();
  }
  this.textarea_el.focus();
};