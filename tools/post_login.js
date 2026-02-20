async function main(){
  try{
    const res = await fetch('http://127.0.0.1:4000/api/public/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: 'merlin', password: 'zF_ve)ssW]bE' })
    });
    const text = await res.text();
    try{
      const json = JSON.parse(text);
      console.log('STATUS', res.status);
      console.log(JSON.stringify(json, null, 2));
    }catch(e){
      console.log('STATUS', res.status);
      console.log('RESPONSE_TEXT:\n', text);
    }
  }catch(err){
    console.error('REQUEST ERROR', err);
    process.exit(2);
  }
}

main();
